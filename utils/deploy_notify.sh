# shellcheck shell=bash

if [[ "${MEO_DEPLOY_NOTIFY_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_NOTIFY_LOADED="true"

: "${PROJECT_ROOT:?PROJECT_ROOT must be set before sourcing deploy_notify.sh}"
: "${ENV_FILE:?ENV_FILE must be set before sourcing deploy_notify.sh}"

# Provide safe defaults when sourced in isolation (e.g., test script)
# Default deploy log path if not provided by the caller environment
DEPLOY_LOG="${DEPLOY_LOG:-$PROJECT_ROOT/deploy.log}"

# Provide a lightweight fallback for note() if not defined by the caller
if ! command -v note >/dev/null 2>&1; then
    note() { echo "[note] $*" >&2; }
fi

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

    # Try to read from known env files, in priority order: root .env then backend/.env
    local files_to_check=()
    if [ -f "$PROJECT_ROOT/.env" ]; then
        files_to_check+=("$PROJECT_ROOT/.env")
    fi
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
        line=${line#"${key}"=}
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
    date '+%H:%M:%S %Z'
}

deploy_notify_send() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
        return 0
    fi

    local body="$1"
    local text
    text=$(printf "%s\n%s" "$DEPLOY_NOTIFY_PREFIX" "$body")

    # Use shared telegram_send implementation for actual API call
    if ! command -v telegram_send >/dev/null 2>&1; then
        # shellcheck source=./telegram_notify.sh
        source "$PROJECT_ROOT/utils/telegram_notify.sh"
    fi

    local curl_exit_code=0
    local curl_output
    local temp_output
    temp_output=$(mktemp)

    TELEGRAM_BOT_TOKEN=$(deploy_notify_env_value TELEGRAM_BOT_TOKEN)
    CHAT_ID=$(deploy_notify_env_value CHAT_ID)

    curl --silent --show-error --max-time 10 --retry 2 --retry-delay 2 \
        --data-urlencode "chat_id=$CHAT_ID" \
        --data-urlencode "text=$text" \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        > "$temp_output" 2>&1 || curl_exit_code=$?
    curl_output=$(cat "$temp_output" 2>/dev/null || true)
    rm -f "$temp_output"

    if [ $curl_exit_code -ne 0 ]; then
        note "WARNING: Failed to send Telegram notification (exit code: $curl_exit_code)"
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
    
    # Build deployment flags message
    local flags_msg=""
    local flags=()
    
    if [ "${DEPLOY_FLAG_FRESH:-false}" = "true" ]; then
        flags+=("--fresh")
    fi
    if [ "${DEPLOY_FLAG_NO_CACHE:-false}" = "true" ]; then
        flags+=("--no-cache")
    fi
    if [ "${DEPLOY_FLAG_SEED:-false}" = "true" ]; then
        flags+=("--seed")
    fi
    if [ "${DEPLOY_FLAG_NO_INTERACTIVE:-false}" = "true" ]; then
        flags+=("--no-interactive")
    fi
    if [ "${DEPLOY_FLAG_SKIP_GIT_SYNC:-false}" = "true" ]; then
        flags+=("--skip-git-sync")
    fi
    if [ "${DEPLOY_FLAG_CLEAN_UP:-false}" = "true" ]; then
        flags+=("--clean-up")
    fi
    
    if [ ${#flags[@]} -gt 0 ]; then
        flags_msg=" with flags: ${flags[*]}"
    fi
    
    # Include disk space warning if present
    local disk_warning=""
    if [ -n "${DISK_SPACE_WARNING:-}" ]; then
        disk_warning="\n\n${DISK_SPACE_WARNING}"
    fi
    
    deploy_notify_send "🚀 Deployment started at ${DEPLOY_NOTIFY_STARTED_AT}${flags_msg}.${disk_warning}"
}

deploy_notify_send_success() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ] || [ "$DEPLOY_NOTIFY_SUCCESS_SENT" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_STATUS="completed"
    DEPLOY_NOTIFY_SUCCESS_SENT="true"
    # Compute total time safely (if start time missing, default to 0)
    local now_ts start_ts total_time
    now_ts=$(date +%s)
    if [ -n "$DEPLOY_NOTIFY_STARTED_AT" ]; then
        start_ts=$(date -d "$DEPLOY_NOTIFY_STARTED_AT" +%s 2>/dev/null || echo "$now_ts")
    else
        start_ts="$now_ts"
    fi
    total_time=$(( now_ts - start_ts ))
    DEPLOY_TOTAL_TIME="$total_time"
    deploy_notify_send "✅ Deployment finished at $(deploy_notify_now). Total time: ${DEPLOY_TOTAL_TIME} seconds."
}

deploy_notify_send_failure() {
    if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ] || [ "$DEPLOY_NOTIFY_FAILURE_SENT" = "true" ]; then
        return 0
    fi

    DEPLOY_NOTIFY_STATUS="failed"
    DEPLOY_NOTIFY_FAILURE_SENT="true"
    
    # Compute total time if available
    local total_time="unknown"
    if [ -n "$DEPLOY_NOTIFY_STARTED_AT" ]; then
        local now_ts start_ts
        now_ts=$(date +%s)
        start_ts=$(date -d "$DEPLOY_NOTIFY_STARTED_AT" +%s 2>/dev/null || echo "$now_ts")
        total_time=$(( now_ts - start_ts ))
    fi
    
    # Collect failure context
    local msg="❌ Deployment failed at $(deploy_notify_now)."
    msg="${msg}\nDuration: ${total_time}s"
    
    # Add exit code if available from shell
    if [ -n "${DEPLOY_EXIT_CODE:-}" ]; then
        msg="${msg}\nExit code: ${DEPLOY_EXIT_CODE}"
    fi
    
    # Add last error line from log if available
    if [ -n "${DEPLOY_LOG:-}" ] && [ -f "$DEPLOY_LOG" ]; then
        local last_errors
        last_errors=$(tail -n 5 "$DEPLOY_LOG" 2>/dev/null | grep -E "^(✗|ERROR|error:|failed)" | tail -n 2 || true)
        if [ -n "$last_errors" ]; then
            msg="${msg}\n\nLast errors:\n${last_errors}"
        fi
    fi
    
    # Add git commit info if available
    if [ -n "${PROJECT_ROOT:-}" ] && command -v git >/dev/null 2>&1; then
        local commit_short
        commit_short=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
        if [ "$commit_short" != "unknown" ]; then
            msg="${msg}\n\nCommit: ${commit_short}"
        fi
    fi
    
    deploy_notify_send "$msg"
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
    
    # Store exit code for failure message context
    DEPLOY_EXIT_CODE="$exit_status"

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
    # Read TELEGRAM_BOT_TOKEN and CHAT_ID from env or env files (env → .env → backend/.env)
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
