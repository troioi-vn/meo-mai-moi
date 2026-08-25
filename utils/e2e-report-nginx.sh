#!/usr/bin/env bash
#
# Installs the internal e2e report vhost and the demo maintenance page.
#
#   utils/e2e-report-nginx.sh install   # render, install, test, reload
#   utils/e2e-report-nginx.sh render    # print the rendered config
#   utils/e2e-report-nginx.sh status    # show what is installed
#
# Follows the same shape as dev-admin-nginx.sh. See docs/e2e-ci.md.

set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

NGINX_TEMPLATE="$PROJECT_ROOT/deploy/nginx/e2e.int.catarchy.space.conf.template"
NGINX_TARGET="/etc/nginx/conf.d/e2e.int.catarchy.space.conf"
MAINTENANCE_SOURCE="$PROJECT_ROOT/deploy/nginx/dev-maintenance.html"
MAINTENANCE_DIR="${E2E_MAINTENANCE_DIR:-/var/www/dev-maintenance}"

REPORT_ROOT="${E2E_REPORT_ROOT:-/opt/e2e-reports/meo-mai-moi}"
INTERNAL_CERT="${INTERNAL_CERT:-/etc/ssl/internal/int.catarchy.space/fullchain.pem}"
INTERNAL_KEY="${INTERNAL_KEY:-/etc/ssl/internal/int.catarchy.space/privkey.pem}"

use_sudo() {
    if command -v sudo >/dev/null 2>&1; then
        sudo -n "$@"
    else
        "$@"
    fi
}

# The runner writes the maintenance marker and the report directories without
# sudo, so both must belong to whoever runs it. `SUDO_USER` is set when this
# script is itself invoked through sudo, which is the normal case.
RUN_AS_USER="${SUDO_USER:-$(id -un)}"
RUN_AS_GROUP="$(id -gn "$RUN_AS_USER" 2>/dev/null || id -gn)"

render_nginx_config() {
    sed -e "s#__REPORT_ROOT__#${REPORT_ROOT}#g" \
        -e "s#__INTERNAL_CERT__#${INTERNAL_CERT}#g" \
        -e "s#__INTERNAL_KEY__#${INTERNAL_KEY}#g" \
        "$NGINX_TEMPLATE"
}

install_maintenance_page() {
    use_sudo install -d -m 755 -o "$RUN_AS_USER" -g "$RUN_AS_GROUP" "$MAINTENANCE_DIR"
    use_sudo install -m 644 "$MAINTENANCE_SOURCE" "$MAINTENANCE_DIR/maintenance.html"

    # Never ship the marker itself. Its presence is what takes the demo down,
    # and installing one here would do exactly that.
    if [ -e "$MAINTENANCE_DIR/on" ]; then
        printf 'WARNING: %s/on exists — the demo is currently showing the refresh page.\n' "$MAINTENANCE_DIR" >&2
    fi
}

install_report_root() {
    use_sudo install -d -m 755 -o "$RUN_AS_USER" -g "$RUN_AS_GROUP" "$REPORT_ROOT"
    use_sudo install -d -m 755 -o "$RUN_AS_USER" -g "$RUN_AS_GROUP" "$REPORT_ROOT/dev"
}

install_stale_marker_timer() {
    # The runner's EXIT trap cannot survive SIGKILL, an OOM, or a reboot, and a
    # maintenance page nobody clears is worse than the mess it prevents.
    local unit=/etc/systemd/system/dev-maintenance-unstick.service
    local timer=/etc/systemd/system/dev-maintenance-unstick.timer

    use_sudo tee "$unit" >/dev/null <<UNIT
[Unit]
Description=Clear a stale meo-mai-moi demo maintenance marker

[Service]
Type=oneshot
ExecStart=/usr/bin/find ${MAINTENANCE_DIR} -maxdepth 1 -name on -mmin +20 -delete
UNIT

    use_sudo tee "$timer" >/dev/null <<'TIMER'
[Unit]
Description=Clear a stale meo-mai-moi demo maintenance marker

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
TIMER

    use_sudo systemctl daemon-reload
    use_sudo systemctl enable --now dev-maintenance-unstick.timer
}

install_all() {
    local tmp_file
    tmp_file="$(mktemp)"
    render_nginx_config > "$tmp_file"

    install_report_root
    install_maintenance_page
    use_sudo mv "$tmp_file" "$NGINX_TARGET"
    use_sudo nginx -t
    use_sudo systemctl reload nginx
    install_stale_marker_timer

    printf 'Installed %s\n' "$NGINX_TARGET"
    printf 'Reports served from %s\n' "$REPORT_ROOT"
}

show_status() {
    printf 'vhost:            %s\n' "$([ -f "$NGINX_TARGET" ] && echo present || echo missing)"
    printf 'report root:      %s\n' "$([ -d "$REPORT_ROOT" ] && echo "$REPORT_ROOT" || echo missing)"
    printf 'maintenance page: %s\n' "$([ -f "$MAINTENANCE_DIR/maintenance.html" ] && echo present || echo missing)"
    printf 'marker set now:   %s\n' "$([ -e "$MAINTENANCE_DIR/on" ] && echo 'YES — demo is down' || echo no)"
    printf 'unstick timer:    %s\n' "$(systemctl is-active dev-maintenance-unstick.timer 2>/dev/null || echo inactive)"
}

case "${1:-install}" in
    render)  render_nginx_config ;;
    install) install_all ;;
    status)  show_status ;;
    *)       printf 'Usage: %s [render|install|status]\n' "$0" >&2; exit 2 ;;
esac
