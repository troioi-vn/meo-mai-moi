#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/backend/.env}"

EXPECTED_BRANCH="${MEO_CI_EXPECT_BRANCH:-dev}"
CURRENT_BRANCH="${CI_COMMIT_BRANCH:-${WOODPECKER_COMMIT_BRANCH:-${CI_BRANCH:-}}}"
CURRENT_COMMIT="${CI_COMMIT_SHA:-${WOODPECKER_COMMIT_SHA:-}}"
LOCK_EXIT_CODE="${DEPLOY_LOCK_CONTENTION_EXIT_CODE:-42}"
LOCK_WAIT_SECONDS="${MEO_CI_LOCK_WAIT_SECONDS:-900}"
LOCK_RETRY_INTERVAL="${MEO_CI_LOCK_RETRY_INTERVAL:-5}"

if [ -z "$CURRENT_BRANCH" ]; then
    git_branch="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    if [ -n "$git_branch" ] && [ "$git_branch" != "HEAD" ]; then
        CURRENT_BRANCH="$git_branch"
    fi
fi

if [ -z "$CURRENT_COMMIT" ]; then
    CURRENT_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || true)"
fi

if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "✗ Refusing CI dev deploy from branch '$CURRENT_BRANCH' (expected '$EXPECTED_BRANCH')." >&2
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/deploy.sh" ]; then
    echo "✗ deploy.sh is missing or not executable at $SCRIPT_DIR/deploy.sh" >&2
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/dev-slot.sh" ]; then
    echo "✗ dev-slot.sh is missing or not executable at $SCRIPT_DIR/dev-slot.sh" >&2
    exit 1
fi

# shellcheck source=./deploy_notify.sh
source "$SCRIPT_DIR/deploy_notify.sh"

run_deploy_with_lock_retry() {
    local started_at
    started_at=$(date +%s)

    while true; do
        set +e
        "$SCRIPT_DIR/deploy.sh" \
            --no-interactive \
            --quiet
        local exit_code=$?
        set -e

        if [ "$exit_code" -eq 0 ]; then
            return 0
        fi

        if [ "$exit_code" -ne "$LOCK_EXIT_CODE" ]; then
            return "$exit_code"
        fi

        local now elapsed
        now=$(date +%s)
        elapsed=$(( now - started_at ))

        if [ "$elapsed" -ge "$LOCK_WAIT_SECONDS" ]; then
            echo "✗ Another deployment kept the lock for ${elapsed}s; giving up." >&2
            return "$exit_code"
        fi

        echo "⚠️  Another deployment is holding the lock. Waiting ${LOCK_RETRY_INTERVAL}s before retrying..." >&2
        sleep "$LOCK_RETRY_INTERVAL"
    done
}

active_slot="$("$SCRIPT_DIR/dev-slot.sh" active)"
inactive_slot="$("$SCRIPT_DIR/dev-slot.sh" inactive)"
target_service="$("$SCRIPT_DIR/dev-slot.sh" service "$inactive_slot")"
target_backend_port="$("$SCRIPT_DIR/dev-slot.sh" backend-port "$inactive_slot")"
target_reverb_port="$("$SCRIPT_DIR/dev-slot.sh" reverb-port "$inactive_slot")"

echo "Starting CI A/B deployment for dev environment"
echo "  Active slot:   $active_slot"
echo "  Target slot:   $inactive_slot"
echo "  Target service: $target_service"
echo "  Target ports:  backend=$target_backend_port reverb=$target_reverb_port"
if [ -n "$CURRENT_COMMIT" ]; then
    echo "  Commit:        $CURRENT_COMMIT"
fi

export DEPLOY_BACKEND_SERVICE="$target_service"
export DEPLOY_BACKEND_HOST_PORT="$target_backend_port"
export DEPLOY_COMPOSE_PROFILES="slot-$inactive_slot"

run_deploy_with_lock_retry

echo "Switching nginx to slot $inactive_slot..."
"$SCRIPT_DIR/dev-slot.sh" activate "$inactive_slot"

deploy_notify_initialize
deploy_notify_send_ab_switch \
    "$active_slot" \
    "$inactive_slot" \
    "$target_service" \
    "$target_backend_port" \
    "$target_reverb_port"

echo "A/B deployment complete. Active slot is now $inactive_slot."
