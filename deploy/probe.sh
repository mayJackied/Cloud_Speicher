#!/usr/bin/env bash
# 在服务器上跑：bash probe.sh
# 把 ---BEGIN--- 到 ---END--- 整段贴回助手。
set -u

echo '---BEGIN---'
echo "date: $(date -Is 2>/dev/null || date)"
echo "whoami: $(whoami)"
echo "id: $(id)"
echo "pwd: $(pwd)"
echo "hostname: $(hostname)"
echo "uname: $(uname -a)"
echo
if [ -f /etc/os-release ]; then
  echo '--- os-release ---'
  cat /etc/os-release
  echo
fi
echo '--- nginx ---'
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1
  nginx -t 2>&1 || true
else
  echo 'nginx: not installed'
fi
echo
echo '--- listening ---'
if command -v ss >/dev/null 2>&1; then
  ss -lntup 2>/dev/null || ss -lnt
elif command -v netstat >/dev/null 2>&1; then
  netstat -lntup 2>/dev/null || netstat -lnt
else
  echo 'ss/netstat missing'
fi
echo
echo '--- java / jar ---'
ps -eo pid,cmd --sort=cmd 2>/dev/null | grep -Ei 'java|jar|frps|frpc|nginx' | grep -v grep || echo 'no matching process'
echo
echo '--- disk ---'
df -hT /
echo
echo '--- firewall ---'
if command -v firewall-cmd >/dev/null 2>&1; then
  echo "firewalld: $(firewall-cmd --state 2>&1)"
  firewall-cmd --list-all 2>/dev/null || true
elif command -v ufw >/dev/null 2>&1; then
  ufw status verbose 2>/dev/null || true
else
  echo 'no firewalld/ufw'
fi
if command -v iptables >/dev/null 2>&1; then
  echo 'iptables filter INPUT (first 30):'
  iptables -L INPUT -n 2>/dev/null | head -n 30 || true
fi
echo
echo '--- selinux ---'
if command -v getenforce >/dev/null 2>&1; then
  getenforce
else
  echo 'n/a'
fi
echo
echo '--- nginx conf snippets ---'
ls -la /etc/nginx/conf.d 2>/dev/null || true
ls -la /etc/nginx/sites-enabled 2>/dev/null || true
echo
echo '--- web root ---'
ls -la /var/www 2>/dev/null || true
ls -la /var/www/cloud-speicher 2>/dev/null || true
echo
echo '--- curl local backend ---'
for url in \
  'http://127.0.0.1:8080/api/user/login' \
  'http://127.0.0.1:8080/api/' \
  'http://127.0.0.1:8080/'
do
  echo "HEAD $url"
  curl -sS -m 5 -o /dev/null -w 'http_code=%{http_code} time=%{time_total}\n' -X GET "$url" || echo "curl failed: $url"
done
echo '---END---'
