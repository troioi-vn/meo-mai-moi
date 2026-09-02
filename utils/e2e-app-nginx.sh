#!/usr/bin/env bash
#
# Installs the vhost the e2e suite talks to: dev.meo-mai-moi.com on 127.0.0.2,
# served by backend_e2e. See deploy/nginx/dev-e2e.conf.template.
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROOT_ENV_FILE="$PROJECT_ROOT/.env"
NGINX_TEMPLATE="$PROJECT_ROOT/deploy/nginx/dev-e2e.conf.template"
NGINX_TARGET="/etc/nginx/conf.d/dev-e2e.conf"

read_env_value() {
    local file="$1"
    local key="$2"
    local default_value="${3:-}"

    if [ -f "$file" ]; then
        local value
        value=$(
            {
                grep -E "^${key}=" "$file" || true
            } | tail -n1 | cut -d '=' -f2- | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
        )
        if [ -n "$value" ]; then
            printf '%s' "$value"
            return
        fi
    fi

    printf '%s' "$default_value"
}

use_sudo() {
    if command -v sudo >/dev/null 2>&1; then
        sudo -n "$@"
    else
        "$@"
    fi
}

render_nginx_config() {
    local backend_port reverb_port
    backend_port=$(read_env_value "$ROOT_ENV_FILE" "E2E_BACKEND_HOST_PORT" "8004")
    reverb_port=$(read_env_value "$ROOT_ENV_FILE" "E2E_REVERB_HOST_PORT" "8084")

    sed -e "s/__E2E_BACKEND_PORT__/${backend_port}/g" \
        -e "s/__E2E_REVERB_PORT__/${reverb_port}/g" \
        "$NGINX_TEMPLATE"
}

install_nginx_config() {
    local tmp_file
    tmp_file=$(mktemp)
    render_nginx_config > "$tmp_file"
    use_sudo mv "$tmp_file" "$NGINX_TARGET"
    use_sudo nginx -t
    use_sudo systemctl reload nginx
}

cmd="${1:-install}"

case "$cmd" in
    render)
        render_nginx_config
        ;;
    install)
        install_nginx_config
        ;;
    *)
        echo "Usage: $0 {render|install}" >&2
        exit 1
        ;;
esac
