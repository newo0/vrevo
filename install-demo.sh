#!/usr/bin/env bash
# Install the prebuilt, password-protected demo on a fresh Ubuntu 24.04 x86_64 VPS.
set -Eeuo pipefail
umask 077
die() { printf '%s\n' "$*" >&2; exit 1; }
trap 'printf "Установка остановлена на строке %s. Пришлите последние строки ошибки.\n" "$LINENO" >&2' ERR

[[ $EUID -eq 0 ]] || die 'Запустите установщик под root.'
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || die 'Этот установщик подготовлен для Ubuntu 24.04.'
[[ $(uname -m) == x86_64 ]] || die 'Нужна архитектура x86_64.'
[[ -d /run/systemd/system ]] || die 'Для запуска необходим systemd.'
exec 9>/run/lock/tikhoe-demo-install.lock
flock -n 9 || die 'Установщик уже запущен.'

app_root=/opt/tikhoe-demo
state_dir=/var/lib/tikhoe-demo
config_dir=/etc/tikhoe-demo
release_ref=${TIKHOE_RELEASE_REF:?Укажите TIKHOE_RELEASE_REF — идентификатор подготовленного выпуска.}
[[ $release_ref =~ ^[0-9a-f]{40}$ ]] || die 'Некорректный идентификатор выпуска.'
release_url="https://raw.githubusercontent.com/newo0/vrevo/$release_ref"
bundle_sha=5e2fb9db3ec06449314776e03d2821258f1c3a52adb75261ff2861e2ea428500

show_result() {
    printf '\nКП «Тихое»: http://90.156.135.117\nЛогин просмотра: preview\nПароль просмотра: '
    cat "$config_dir/preview-password"
    printf '\nЭто демоверсия. Отправка писем и внешнее управление отключены.\n'
}

if [[ -e $app_root/installed ]]; then
    systemctl is-active --quiet tikhoe-demo || die 'Установка уже есть, но сервис остановлен. Проверьте: journalctl -u tikhoe-demo -n 30 --no-pager'
    curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3000/api/plots >/dev/null
    show_result
    exit 0
fi
if [[ -e $app_root && ! -f $app_root/.managed ]]; then
    die "$app_root уже существует и не принадлежит этому установщику."
fi
if [[ ! -e $app_root ]] && id tikhoe-demo >/dev/null 2>&1; then
    die 'Пользователь tikhoe-demo уже существует. Требуется ручная проверка.'
fi
for target in /etc/nginx/sites-available/tikhoe-demo /etc/systemd/system/tikhoe-demo.service; do
    [[ ! -e $target || -f $app_root/.managed ]] || die "Найден существующий файл $target; установка остановлена."
done
if ss -H -ltn 'sport = :3000' | read -r _; then
    [[ -f $app_root/.managed ]] && systemctl is-active --quiet tikhoe-demo || die 'Порт 3000 уже занят другим приложением.'
    systemctl stop tikhoe-demo
fi
if ss -H -ltnp 'sport = :80' | grep -qv 'nginx'; then
    die 'Порт 80 занят другим приложением. Установщик не будет его останавливать.'
fi
available_kb=$(df -Pk /opt | awk 'NR==2 {print $4}')
(( available_kb >= 1572864 )) || die 'Для установки нужно не менее 1,5 ГБ свободного диска.'
mkdir -p "$app_root"
touch "$app_root/.managed"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl nginx apache2-utils xz-utils openssl

work_dir=$(mktemp -d /tmp/tikhoe-install.XXXXXXXX)
trap 'rm -rf -- "$work_dir"' EXIT
curl --fail --location --show-error --connect-timeout 20 --max-time 180 --retry 2 --retry-max-time 240 "$release_url/tikhoe-demo.tar.gz" -o "$work_dir/tikhoe-demo.tar.gz"
printf '%s  %s\n' "$bundle_sha" "$work_dir/tikhoe-demo.tar.gz" | sha256sum --check -

# Node is installed separately; do not change a system-wide Node installation.
# This unmodified official archive was checked against nodejs.org SHASUMS256.txt
# before mirroring in the release. The VPS only needs GitHub for both archives.
node_version=v24.19.0
node_file="node-$node_version-linux-x64.tar.xz"
node_sha=14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647
curl --fail --location --show-error --connect-timeout 20 --max-time 180 --retry 2 --retry-max-time 240 "$release_url/$node_file" -o "$work_dir/$node_file"
printf '%s  %s\n' "$node_sha" "$node_file" > "$work_dir/node.sha256"
(cd "$work_dir" && sha256sum --check node.sha256)
mkdir -p "$app_root/node"
tar -xJf "$work_dir/$node_file" -C "$app_root/node" --strip-components=1 --no-same-owner
"$app_root/node/bin/node" --version
tar -xzf "$work_dir/tikhoe-demo.tar.gz" -C "$app_root" --no-same-owner

if ! id tikhoe-demo >/dev/null 2>&1; then
    useradd --system --user-group --home-dir "$state_dir" --shell /usr/sbin/nologin tikhoe-demo
fi
install -d -m 700 -o tikhoe-demo -g tikhoe-demo "$state_dir" "$state_dir/uploads"
if [[ ! -e $state_dir/site.db ]]; then
    install -m 600 -o tikhoe-demo -g tikhoe-demo "$app_root/template/site.db" "$state_dir/site.db"
fi
ln -sfn "$state_dir" "$app_root/app/storage"
install -d -m 750 -o root -g tikhoe-demo "$config_dir"
if [[ ! -e $config_dir/app.env ]]; then
    cat > "$config_dir/app.env" <<'ENV'
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
SITE_MODE=demo
SITE_URL=http://90.156.135.117
DATABASE_URL=file:/var/lib/tikhoe-demo/site.db
NODE_OPTIONS=--max-old-space-size=512
MALLOC_ARENA_MAX=2
NEXT_TELEMETRY_DISABLED=1
ENV
fi
chown root:tikhoe-demo "$config_dir/app.env"
chmod 640 "$config_dir/app.env"
grep -qx 'SITE_MODE=demo' "$config_dir/app.env" || die 'Этот установщик предназначен только для демоверсии.'
chmod 755 "$app_root" "$app_root/node"
chmod -R a+rX "$app_root/node" "$app_root/app"
mkdir -p "$app_root/app/.next/cache"
chown -R tikhoe-demo:tikhoe-demo "$app_root/app/.next/cache"

if [[ ! -s $config_dir/preview-password ]]; then
    openssl rand -hex 12 > "$config_dir/preview-password"
fi
htpasswd -iBc /etc/nginx/tikhoe-demo.htpasswd preview < "$config_dir/preview-password"
chown root:www-data /etc/nginx/tikhoe-demo.htpasswd
chmod 640 /etc/nginx/tikhoe-demo.htpasswd
install -m 644 "$app_root/deploy/tikhoe-demo.service" /etc/systemd/system/tikhoe-demo.service
install -m 644 "$app_root/deploy/nginx-demo.conf" /etc/nginx/sites-available/tikhoe-demo
ln -sfn /etc/nginx/sites-available/tikhoe-demo /etc/nginx/sites-enabled/tikhoe-demo
nginx -t
systemctl daemon-reload
systemctl enable --now tikhoe-demo
ready=0
for attempt in {1..30}; do
    if curl --fail --silent --max-time 3 http://127.0.0.1:3000/api/plots -o "$work_dir/plots.json"; then
        ready=1
        break
    fi
    sleep 2
done
[[ $ready == 1 ]] || die 'Приложение не запустилось. Диагностика: journalctl -u tikhoe-demo -n 40 --no-pager'
"$app_root/node/bin/node" -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(p.plots?.length!==146)process.exit(1)' "$work_dir/plots.json"
systemctl enable --now nginx
systemctl reload nginx
if command -v ufw >/dev/null && LC_ALL=C ufw status | grep -q '^Status: active'; then
    ufw allow 80/tcp comment 'Tikhoe demo'
fi
status=$(curl --silent --output /dev/null --write-out '%{http_code}' --header 'Host: 90.156.135.117' http://127.0.0.1/)
[[ $status == 401 ]] || die 'Защита демоверсии не прошла проверку.'
printf 'user = "preview:%s"\n' "$(cat "$config_dir/preview-password")" > "$work_dir/curl.conf"
curl --config "$work_dir/curl.conf" --fail --silent --show-error --max-time 15 --header 'Host: 90.156.135.117' http://127.0.0.1/ -o "$work_dir/home.html"
grep -q 'Тихое' "$work_dir/home.html" || die 'Название сайта не найдено в ответе сервера.'
status=$(curl --config "$work_dir/curl.conf" --silent --output /dev/null --write-out '%{http_code}' --header 'Host: 90.156.135.117' http://127.0.0.1/admin)
[[ $status == 403 ]] || die 'Управление должно быть недоступно на временном HTTP-адресе.'
touch "$app_root/installed"
show_result
