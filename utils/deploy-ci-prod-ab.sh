#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/backend/.env}"

EXPECTED_BRANCH="${MEO_CI_EXPECT_BRANCH:-main}"
CURRENT_BRANCH="${CI_COMMIT_BRANCH:-${WOODPECKER_COMMIT_BRANCH:-${CI_BRANCH:-}}}"
CURRENT_COMMIT="${CI_COMMIT_SHA:-${WOODPECKER_COMMIT_SHA:-}}"

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
    echo "✗ Refusing CI production deploy from branch '$CURRENT_BRANCH' (expected '$EXPECTED_BRANCH')." >&2
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/deploy.sh" ]; then
    echo "✗ deploy.sh is missing or not executable at $SCRIPT_DIR/deploy.sh" >&2
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/prod-slot.sh" ]; then
    echo "✗ prod-slot.sh is missing or not executable at $SCRIPT_DIR/prod-slot.sh" >&2
    exit 1
fi

# shellcheck source=./deploy_notify.sh
source "$SCRIPT_DIR/deploy_notify.sh"

active_slot="$("$SCRIPT_DIR/prod-slot.sh" active)"
inactive_slot="$("$SCRIPT_DIR/prod-slot.sh" inactive)"
target_service="$("$SCRIPT_DIR/prod-slot.sh" service "$inactive_slot")"
target_backend_port="$("$SCRIPT_DIR/prod-slot.sh" backend-port "$inactive_slot")"
target_reverb_port="$("$SCRIPT_DIR/prod-slot.sh" reverb-port "$inactive_slot")"

echo "Starting CI A/B deployment for production environment"
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
export SLOT_A_BACKEND_HOST_BIND="${SLOT_A_BACKEND_HOST_BIND:-127.0.0.1}"
export SLOT_A_BACKEND_HOST_PORT="${SLOT_A_BACKEND_HOST_PORT:-8011}"
export SLOT_A_REVERB_HOST_BIND="${SLOT_A_REVERB_HOST_BIND:-127.0.0.1}"
export SLOT_A_REVERB_HOST_PORT="${SLOT_A_REVERB_HOST_PORT:-8091}"
export SLOT_B_BACKEND_HOST_BIND="${SLOT_B_BACKEND_HOST_BIND:-127.0.0.1}"
export SLOT_B_BACKEND_HOST_PORT="${SLOT_B_BACKEND_HOST_PORT:-8012}"
export SLOT_B_REVERB_HOST_BIND="${SLOT_B_REVERB_HOST_BIND:-127.0.0.1}"
export SLOT_B_REVERB_HOST_PORT="${SLOT_B_REVERB_HOST_PORT:-8092}"

"$SCRIPT_DIR/deploy.sh" \
    --no-interactive \
    --quiet \
    --auto-backup

echo "Switching nginx to slot $inactive_slot..."
"$SCRIPT_DIR/prod-slot.sh" activate "$inactive_slot"

echo "Stopping legacy single-backend service if it is still running..."
docker compose stop backend 2>/dev/null || true

deploy_notify_initialize
deploy_notify_send_ab_switch \
    "$active_slot" \
    "$inactive_slot" \
    "$target_service" \
    "$target_backend_port" \
    "$target_reverb_port"

echo "Production A/B deployment complete. Active slot is now $inactive_slot."
