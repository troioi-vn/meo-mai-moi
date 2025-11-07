# shellcheck shell=bash

if [[ "${MEO_DEPLOY_NOTIFY_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_NOTIFY_LOADED="true"

: "${PROJECT_ROOT:?PROJECT_ROOT must be set before sourcing deploy_notify.sh}"
: "${ENV_FILE:?ENV_FILE must be set before sourcing deploy_notify.sh}"

DEPLOY_NOTIFY_ENABLED="false"
DEPLOY_NOTIFY_STATUS="disabled"
TELEGRAM_BOT_TOKEN=""
CHAT_ID=""
DEPLOY_NOTIFY_PREFIX=""
DEPLOY_NOTIFY_STARTED_AT=""
DEPLOY_NOTIFY_TRAPS_INSTALLED="false"
DEPLOY_NOTIFY_FAILURE_SENT="false"
DEPLOY_NOTIFY_SUCCESS_SENT="false"
DEPLOY_NOTIFY_START_SENT="false"

deploy_notify_env_value() {
    local key="$1"
    local val="${!key:-}"
    if [ -n "$val" ]; then
        printf "%s" "$val"
        return 0
    fi

    # Try to read from known env files, in priority order
    local files_to_check=()
    if [ -f "$ENV_FILE" ]; then
        files_to_check+=("$ENV_FILE")
    fi

    local file
    for file in "${files_to_check[@]}"; do
        local line
        line=$(grep -E "^${key}=" "$file" | tail -n1 || true)
        if [ -z "$line" ]; then
            continue
        fi

        line=${line%%#*}
        line=${line#${key}=}
        line=${line%$'\r'}
        line=${line%\"}
        line=${line#\"}
        line=${line%\'}
        line=${line#\'}
        line=$(printf "%s" "$line" | sed 's/[[:space:]]*$//')

        printf "%s" "$line"
        return 0
    done
}

deploy_notify_now() {
    date '+%Y-%m-%d %H:%M:%S %Z'
}

deploy_notify_send() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
        return 0
    fi

    local body="$1"
    local text
    text=$(printf "%s:\n%s" "$DEPLOY_NOTIFY_PREFIX" "$body")
    
    local curl_output
    local curl_exit_code=0

    if ! curl_output=$(curl --silent --show-error --max-time 10 --retry 2 --retry-delay 2 \
        --data-urlencode "chat_id=$CHAT_ID" \
        --data-urlencode "text=$text" \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" 2>&1); then
        curl_exit_code=$?
        note "WARNING: Failed to send Telegram notification (exit code: $curl_exit_code)"
        
        # Log failure details to separate notification log
        local notify_log="${DEPLOY_LOG}.notifications"
        local timestamp
        timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
        {
            echo "=== $timestamp ==="
            echo "Failed to send notification"
            echo "Exit code: $curl_exit_code"
            echo "Message: $text"
            echo "Response: $curl_output"
            echo ""
        } >> "$notify_log" 2>&1 || true
        
        # Also log to structured log if available
        if command -v log_warn >/dev/null 2>&1; then
            log_warn "Telegram notification failed" "exit_code=$curl_exit_code"
        fi
    fi
}

deploy_notify_send_start() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ] || [ "$DEPLOY_NOTIFY_START_SENT" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_STATUS="running"
    DEPLOY_NOTIFY_STARTED_AT=$(deploy_notify_now)
    DEPLOY_NOTIFY_START_SENT="true"
    deploy_notify_send "🚀 Deployment started at ${DEPLOY_NOTIFY_STARTED_AT}."
}

deploy_notify_send_success() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ] || [ "$DEPLOY_NOTIFY_SUCCESS_SENT" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_STATUS="completed"
    DEPLOY_NOTIFY_SUCCESS_SENT="true"
    DEPLOY_TOTAL_TIME=$(( $(date +%s) - $(date -d "$DEPLOY_NOTIFY_STARTED_AT" +%s) ))
    deploy_notify_send("✅ Deployment finished at $(deploy_notify_now()). Total time: ${DEPLOY_TOTAL_TIME} seconds.")
}

deploy_notify_send_failure() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ] || [ "$DEPLOY_NOTIFY_FAILURE_SENT" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_STATUS="failed"
    DEPLOY_NOTIFY_FAILURE_SENT="true"
    deploy_notify_send "Deployment failed at $(deploy_notify_now)."
}

deploy_notify_get_trap_cmd() {
    local signal="$1"
    local output
    output=$(trap -p "$signal")
    if [ -z "$output" ]; then
        return 0
    fi
    # Use sed to extract the command from trap output
    output=$(echo "$output" | sed "s/^trap -- '\(.*\)' $signal$/\1/")
    printf "%s" "$output"
}

deploy_notify_on_error() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
        return 0
    fi
    deploy_notify_send_failure
}

deploy_notify_on_exit() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
        return 0
    fi

    local exit_status="$1"

    if [ "$DEPLOY_NOTIFY_FAILURE_SENT" = "true" ]; then
        return 0
    fi

    if [ "$exit_status" -ne 0 ]; then
        deploy_notify_send_failure
    else
        deploy_notify_send_success
    fi
}

deploy_notify_initialize() {
    if [ "$DEPLOY_NOTIFY_STATUS" != "disabled" ]; then
        return 0
    fi

    local token chat app_url host
    # Read TELEGRAM_BOT_TOKEN and CHAT_ID from env or env files
    token=$(deploy_notify_env_value TELEGRAM_BOT_TOKEN)
    chat=$(deploy_notify_env_value CHAT_ID)

    if [ -z "$token" ] || [ -z "$chat" ]; then
        DEPLOY_NOTIFY_STATUS="inactive"
        return 0
    fi

    if ! command -v curl >/dev/null 2>&1; then
        note "WARNING: curl not found; Telegram notifications disabled."
        DEPLOY_NOTIFY_STATUS="inactive"
        return 0
    fi

    app_url=$(deploy_notify_env_value APP_URL)
    if [ -n "$app_url" ]; then
        host=${app_url#*://}
        host=${host%%/*}
        host=${host:-$app_url}
    else
        host="${APP_ENV_CURRENT:-$(basename "$PROJECT_ROOT")}" 
    fi

    TELEGRAM_BOT_TOKEN="$token"
    CHAT_ID="$chat"
    DEPLOY_NOTIFY_PREFIX="${host:-$(basename "$PROJECT_ROOT")}" 
    DEPLOY_NOTIFY_ENABLED="true"
    DEPLOY_NOTIFY_STATUS="pending"
    DEPLOY_NOTIFY_TRAPS_INSTALLED="false"
    DEPLOY_NOTIFY_FAILURE_SENT="false"
    DEPLOY_NOTIFY_SUCCESS_SENT="false"
    DEPLOY_NOTIFY_START_SENT="false"
}

deploy_notify_register_traps() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
        return 0
    fi
    if [ "$DEPLOY_NOTIFY_TRAPS_INSTALLED" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_TRAPS_INSTALLED="true"
    set -E

    local prev_exit prev_err
    prev_exit=$(deploy_notify_get_trap_cmd EXIT)
    prev_err=$(deploy_notify_get_trap_cmd ERR)

    if [ -n "$prev_exit" ]; then
        # shellcheck disable=SC2064
        trap "deploy_notify_on_exit \"\$?\"; $prev_exit" EXIT
    else
        trap 'deploy_notify_on_exit "$?"' EXIT
    fi

    if [ -n "$prev_err" ]; then
        # shellcheck disable=SC2064
        trap "deploy_notify_on_error; $prev_err" ERR
    else
        trap 'deploy_notify_on_error' ERR
    fi
}
