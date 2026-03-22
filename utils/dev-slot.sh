#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROOT_ENV_FILE="$PROJECT_ROOT/.env"
ACTIVE_SLOT_FILE="$PROJECT_ROOT/.deploy-active-slot"
NGINX_TEMPLATE="$PROJECT_ROOT/deploy/nginx/dev.meo-mai-moi.com.conf.template"
NGINX_TARGET="/etc/nginx/conf.d/dev.meo-mai-moi.com.conf"

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

slot_backend_port() {
    case "$1" in
        a) read_env_value "$ROOT_ENV_FILE" "SLOT_A_BACKEND_HOST_PORT" "8001" ;;
        b) read_env_value "$ROOT_ENV_FILE" "SLOT_B_BACKEND_HOST_PORT" "8002" ;;
        *) return 1 ;;
    esac
}

slot_reverb_port() {
    case "$1" in
        a) read_env_value "$ROOT_ENV_FILE" "SLOT_A_REVERB_HOST_PORT" "8081" ;;
        b) read_env_value "$ROOT_ENV_FILE" "SLOT_B_REVERB_HOST_PORT" "8082" ;;
        *) return 1 ;;
    esac
}

slot_service_name() {
    case "$1" in
        a) printf 'backend_a' ;;
        b) printf 'backend_b' ;;
        *) return 1 ;;
    esac
}

active_slot() {
    if [ -f "$ACTIVE_SLOT_FILE" ]; then
        local slot
        slot=$(tr -d '\r\n' < "$ACTIVE_SLOT_FILE")
        case "$slot" in
            a|b) printf '%s' "$slot"; return ;;
        esac
    fi
    printf 'a'
}

inactive_slot() {
    case "$(active_slot)" in
        a) printf 'b' ;;
        b) printf 'a' ;;
    esac
}

use_sudo() {
    if command -v sudo >/dev/null 2>&1; then
        sudo -n "$@"
    else
        "$@"
    fi
}

render_nginx_config() {
    local slot="$1"
    local backend_port reverb_port
    backend_port=$(slot_backend_port "$slot")
    reverb_port=$(slot_reverb_port "$slot")

    sed \
        -e "s/__BACKEND_PORT__/${backend_port}/g" \
        -e "s/__REVERB_PORT__/${reverb_port}/g" \
        "$NGINX_TEMPLATE"
}

activate_slot() {
    local slot="$1"
    local tmp_file
    tmp_file=$(mktemp)
    render_nginx_config "$slot" > "$tmp_file"
    use_sudo mv "$tmp_file" "$NGINX_TARGET"
    use_sudo nginx -t
    use_sudo systemctl reload nginx
    printf '%s\n' "$slot" > "$ACTIVE_SLOT_FILE"
}

show_status() {
    local active inactive
    active=$(active_slot)
    inactive=$(inactive_slot)
    cat <<EOF
active_slot=$active
inactive_slot=$inactive
active_service=$(slot_service_name "$active")
inactive_service=$(slot_service_name "$inactive")
active_backend_port=$(slot_backend_port "$active")
inactive_backend_port=$(slot_backend_port "$inactive")
active_reverb_port=$(slot_reverb_port "$active")
inactive_reverb_port=$(slot_reverb_port "$inactive")
EOF
}

cmd="${1:-status}"

case "$cmd" in
    status)
        show_status
        ;;
    active)
        active_slot
        ;;
    inactive)
        inactive_slot
        ;;
    service)
        slot_service_name "${2:?slot required}"
        ;;
    backend-port)
        slot_backend_port "${2:?slot required}"
        ;;
    reverb-port)
        slot_reverb_port "${2:?slot required}"
        ;;
    activate)
        activate_slot "${2:?slot required}"
        ;;
    *)
        echo "Usage: $0 {status|active|inactive|service <slot>|backend-port <slot>|reverb-port <slot>|activate <slot>}" >&2
        exit 1
        ;;
esac
