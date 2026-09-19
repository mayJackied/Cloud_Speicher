#!/usr/bin/env bash
# 首次在服务器上安装 nginx 并写入站点配置。
# 由本机 deploy-frontend.ps1 -Action setup 上传后执行，也可手工：
#   sudo BACKEND_UPSTREAM=127.0.0.1:8080 bash setup-nginx.sh
set -euo pipefail

BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-127.0.0.1:8080}"
WEB_ROOT="${DEPLOY_WEB_ROOT:-/var/www/cloud-speicher}"
HTTP_PORT="${HTTP_PORT:-8888}"
NGINX_CONF_SRC="${NGINX_CONF_SRC:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/cloud-speicher}"

if [ "$(id -u)" -ne 0 ]; then
  echo '请用 root 或 sudo 跑这个脚本。' >&2
  exit 1
fi

install_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    echo 'nginx 已安装。'
    return
  fi
  echo '正在安装 nginx…'
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y nginx curl
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx curl
  elif command -v yum >/dev/null 2>&1; then
    yum install -y epel-release || true
    yum install -y nginx curl
    if command -v systemctl >/dev/null 2>&1; then
      systemctl stop nginx || true
    fi
  else
    echo '无法识别包管理器，请先手工安装 nginx。' >&2
    exit 1
  fi
}

enable_nginx_service() {
  start_nginx
}

disable_default_site() {
  rm -f /etc/nginx/sites-enabled/default
  mkdir -p /root/cloud-speicher-nginx-backup
  if [ -d /etc/nginx/conf.d ]; then
    for f in /etc/nginx/conf.d/*.conf; do
      [ -e "$f" ] || continue
      if [ "$(basename "$f")" != 'cloud-speicher.conf' ]; then
        mv "$f" "/root/cloud-speicher-nginx-backup/$(basename "$f")"
      fi
    done
  fi
  write_master_nginx_conf
}

write_master_nginx_conf() {
  # 自带 nginx.conf 里有一个没有 listen 的 server{}，注释掉 listen 80 后
  # nginx 会默认再去绑 80，和 FRP 冲突。主配置只保留 include conf.d。
  if [ -f /etc/nginx/nginx.conf ]; then
    cp -a /etc/nginx/nginx.conf /root/cloud-speicher-nginx-backup/nginx.conf.bak
  fi
  local modules_line=''
  if [ -d /usr/share/nginx/modules ]; then
    modules_line='include /usr/share/nginx/modules/*.conf;'
  fi
  cat > /etc/nginx/nginx.conf <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

${modules_line}

events {
    worker_connections 1024;
}

http {
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;
    sendfile            on;
    keepalive_timeout   65;
    types_hash_max_size 4096;
    include /etc/nginx/conf.d/*.conf;
}
EOF
}

dump_nginx_failure() {
  echo '--- systemctl status nginx ---' >&2
  systemctl status nginx.service --no-pager -l || true
  echo '--- journalctl nginx ---' >&2
  journalctl -u nginx -n 40 --no-pager || true
  echo '--- error.log ---' >&2
  tail -n 50 /var/log/nginx/error.log || true
  echo '--- nginx listen lines ---' >&2
  nginx -T 2>/dev/null | grep -nE '^[[:space:]]*listen|[[:space:]]server_name|[[:space:]]root ' || true
}

start_nginx() {
  rm -f /run/nginx.pid /var/run/nginx.pid
  if command -v systemctl >/dev/null 2>&1; then
    systemctl stop nginx || true
    systemctl reset-failed nginx || true
  fi
  nginx -t
  echo '当前 listen 指令：'
  nginx -T 2>/dev/null | grep -E '^[[:space:]]*listen' || true
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable nginx
    if ! systemctl start nginx; then
      dump_nginx_failure
      exit 1
    fi
  else
    nginx
  fi
}

write_site_conf() {
  local src="$NGINX_CONF_SRC"
  if [ -z "$src" ]; then
    if [ -f "$(dirname "$0")/nginx.conf" ]; then
      src="$(dirname "$0")/nginx.conf"
    elif [ -f /tmp/cloud-speicher-nginx.conf ]; then
      src=/tmp/cloud-speicher-nginx.conf
    else
      echo '找不到 nginx.conf。' >&2
      exit 1
    fi
  fi
  mkdir -p /etc/nginx/conf.d
  sed -e "s|__BACKEND_UPSTREAM__|${BACKEND_UPSTREAM}|g" \
      -e "s|__HTTP_PORT__|${HTTP_PORT}|g" \
      "$src" > /etc/nginx/conf.d/cloud-speicher.conf
}

prepare_web_root() {
  mkdir -p "$WEB_ROOT"
  if [ ! -f "$WEB_ROOT/index.html" ]; then
    cat > "$WEB_ROOT/index.html" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<title>Cloud Speicher</title>
<p>前端尚未上传。跑完本机 deploy-frontend.ps1 后刷新。</p>
HTML
  fi
  chmod -R a+rX "$WEB_ROOT"
  if id www-data >/dev/null 2>&1; then
    chown -R www-data:www-data "$WEB_ROOT" || true
  elif id nginx >/dev/null 2>&1; then
    chown -R nginx:nginx "$WEB_ROOT" || true
  fi
}

assert_http_port_free() {
  local hit
  hit="$(ss -lnt 2>/dev/null | awk '{print $4}' | grep -E "[:.]${HTTP_PORT}$" || true)"
  if [ -n "$hit" ]; then
    local who
    who="$(ss -lntup 2>/dev/null | grep -E "[:.]${HTTP_PORT}[[:space:]]" || true)"
    if echo "$who" | grep -q nginx; then
      echo "端口 ${HTTP_PORT} 已由 nginx 占用，将覆盖站点配置。"
      return
    fi
    echo "端口 ${HTTP_PORT} 已被占用，不能启动 nginx：" >&2
    echo "$who" >&2
    exit 1
  fi
}

open_http_port() {
  if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -q running; then
    firewall-cmd --permanent --add-port="${HTTP_PORT}/tcp" || true
    firewall-cmd --reload || true
  fi
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi active; then
    ufw allow "${HTTP_PORT}/tcp" || true
  fi
}

relax_selinux() {
  if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != 'Disabled' ]; then
    if command -v chcon >/dev/null 2>&1; then
      chcon -Rt httpd_sys_content_t "$WEB_ROOT" || true
    fi
    if command -v setsebool >/dev/null 2>&1; then
      setsebool -P httpd_can_network_connect 1 || true
    fi
  fi
}

install_helper_scripts() {
  mkdir -p "$INSTALL_DIR/bin"
  local here
  here="$(cd "$(dirname "$0")" && pwd)"
  if [ -f /tmp/cloud-speicher-update-frontend.sh ]; then
    install -m 755 /tmp/cloud-speicher-update-frontend.sh "$INSTALL_DIR/bin/update-frontend.sh"
  elif [ -f "$here/update-frontend.sh" ]; then
    install -m 755 "$here/update-frontend.sh" "$INSTALL_DIR/bin/update-frontend.sh"
  fi
}

install_nginx
assert_http_port_free
disable_default_site
write_site_conf
prepare_web_root
install_helper_scripts
open_http_port
relax_selinux
nginx -t
enable_nginx_service

echo
echo "nginx 已就绪。"
echo "静态目录: $WEB_ROOT"
echo "反代后端: $BACKEND_UPSTREAM"
echo "HTTP 端口: $HTTP_PORT"
echo "接下来在本机跑: .\\deploy\\deploy-frontend.ps1"
echo "浏览器访问: http://服务器公网IP:${HTTP_PORT}/"
echo "阿里云安全组也要放行 ${HTTP_PORT}（脚本改不了控制台）。"
