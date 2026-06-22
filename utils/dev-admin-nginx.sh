#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROOT_ENV_FILE="$PROJECT_ROOT/.env"
NGINX_TEMPLATE="$PROJECT_ROOT/deploy/nginx/dev-admin.int.catarchy.space.conf.template"
NGINX_TARGET="/etc/nginx/conf.d/dev-admin.int.catarchy.space.conf"

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
    local admin_port
    admin_port=$(read_env_value "$ROOT_ENV_FILE" "ADMIN_HOST_PORT" "8003")

    sed -e "s/__ADMIN_PORT__/${admin_port}/g" "$NGINX_TEMPLATE"
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
