#!/usr/bin/env bash
# Shared Telegram notification helper
# shellcheck shell=bash

if [[ "${MEO_TELEGRAM_NOTIFY_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_TELEGRAM_NOTIFY_LOADED="true"

# Resolve project root if not already set
if [ -z "${PROJECT_ROOT:-}" ]; then
    SCRIPT_DIR_LOCAL="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR_LOCAL")"
fi

TELEGRAM_ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/backend/.env}"

# Prefer process environment (e.g. root .env loaded by docker-compose) when present
telegram_env_value() {
    local key="$1"
    local val

    # 1) Direct environment variable
    val="${!key:-}"
    if [ -n "$val" ]; then
        printf '%s' "$val"
        return 0
    fi

    # 2) Root .env file (Docker Compose env)
    if [ -f "$PROJECT_ROOT/.env" ]; then
        local line
        line=$(grep -E "^${key}=" "$PROJECT_ROOT/.env" | tail -n1 || true)
        if [ -n "$line" ]; then
            line=${line%%#*}
            line=${line#"${key}"=}
            line=${line%$'\r'}
            line=${line%\"}
            line=${line#\"}
            line=${line%\'}
            line=${line#\'}
            line=$(printf '%s' "$line" | sed 's/[[:space:]]*$//')
            printf '%s' "$line"
            return 0
        fi
    fi

    # 3) Backend env file (Laravel runtime)
    if [ -f "$TELEGRAM_ENV_FILE" ]; then
        local line
        line=$(grep -E "^${key}=" "$TELEGRAM_ENV_FILE" | tail -n1 || true)
        if [ -n "$line" ]; then
            line=${line%%#*}
            line=${line#"${key}"=}
            line=${line%$'\r'}
            line=${line%\"}
            line=${line#\"}
            line=${line%\'}
            line=${line#\'}
            line=$(printf '%s' "$line" | sed 's/[[:space:]]*$//')
            printf '%s' "$line"
            return 0
        fi
    fi
}

telegram_send() {
    local message="$1"
    local token chat_id

    token=$(telegram_env_value TELEGRAM_BOT_TOKEN)
    chat_id=$(telegram_env_value CHAT_ID)

    if [ -z "$token" ] || [ -z "$chat_id" ]; then
        return 0
    fi

    curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
        -d "chat_id=${chat_id}" \
        -d "text=${message}" \
        -d "parse_mode=HTML" > /dev/null 2>&1 || true
}

# Backwards-compatible name for existing scripts
send_telegram() {
    telegram_send "$@"
}
