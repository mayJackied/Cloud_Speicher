#!/usr/bin/env bash
# 把本机打好的 dist 包解到 nginx 静态目录。
# 用法：
#   sudo bash update-frontend.sh /tmp/cloud-speicher-frontend.tar.gz
#   sudo bash update-frontend.sh --rollback
set -euo pipefail

WEB_ROOT="${DEPLOY_WEB_ROOT:-/var/www/cloud-speicher}"
PREV_ROOT="${WEB_ROOT}.prev"

if [ "$(id -u)" -ne 0 ]; then
  echo '请用 root 或 sudo 跑这个脚本。' >&2
  exit 1
fi

own_web_root() {
  chmod -R a+rX "$WEB_ROOT"
  if id www-data >/dev/null 2>&1; then
    chown -R www-data:www-data "$WEB_ROOT" || true
  elif id nginx >/dev/null 2>&1; then
    chown -R nginx:nginx "$WEB_ROOT" || true
  fi
  if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != 'Disabled' ]; then
    chcon -Rt httpd_sys_content_t "$WEB_ROOT" || true
  fi
}

if [ "${1:-}" = '--rollback' ]; then
  if [ ! -d "$PREV_ROOT" ]; then
    echo "没有可回滚的目录: $PREV_ROOT" >&2
    exit 1
  fi
  rm -rf "${WEB_ROOT}.failed"
  if [ -d "$WEB_ROOT" ]; then
    mv "$WEB_ROOT" "${WEB_ROOT}.failed"
  fi
  mv "$PREV_ROOT" "$WEB_ROOT"
  own_web_root
  echo "已回滚到上一版: $WEB_ROOT"
  exit 0
fi

TAR="${1:-/tmp/cloud-speicher-frontend.tar.gz}"
if [ ! -f "$TAR" ]; then
  echo "找不到打包文件: $TAR" >&2
  exit 1
fi

TMP="$(mktemp -d /tmp/cloud-speicher-dist.XXXXXX)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

tar -xzf "$TAR" -C "$TMP"
if [ ! -f "$TMP/index.html" ]; then
  echo '压缩包里没有 index.html，打包路径不对。' >&2
  exit 1
fi

rm -rf "$PREV_ROOT"
if [ -d "$WEB_ROOT" ] && [ -f "$WEB_ROOT/index.html" ]; then
  mv "$WEB_ROOT" "$PREV_ROOT"
fi
mkdir -p "$WEB_ROOT"
# 用 tar 再铺一层，避免 TMP 里带隐藏文件时 mv 漏掉。
tar -C "$TMP" -cf - . | tar -C "$WEB_ROOT" -xf -
own_web_root

echo "前端已更新: $WEB_ROOT"
if [ -d "$PREV_ROOT" ]; then
  echo "上一版保留在: $PREV_ROOT （回滚: sudo bash $0 --rollback）"
fi
