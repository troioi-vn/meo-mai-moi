#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

EXPECTED_BRANCH="${MEO_CI_EXPECT_BRANCH:-dev}"
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
    echo "✗ Refusing CI dev deploy from branch '$CURRENT_BRANCH' (expected '$EXPECTED_BRANCH')." >&2
    echo "  Override with MEO_CI_EXPECT_BRANCH if this is intentional." >&2
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/deploy.sh" ]; then
    echo "✗ deploy.sh is missing or not executable at $SCRIPT_DIR/deploy.sh" >&2
    exit 1
fi

echo "Starting CI deployment for dev environment"
if [ -n "$CURRENT_BRANCH" ]; then
    echo "  Branch: $CURRENT_BRANCH"
fi
if [ -n "$CURRENT_COMMIT" ]; then
    echo "  Commit: $CURRENT_COMMIT"
fi

deploy_args=(
    --no-interactive
    --quiet
    --skip-git-sync
)

if [ "${MEO_CI_AUTO_BACKUP:-false}" = "true" ]; then
    deploy_args+=(--auto-backup)
fi

if [ "${MEO_CI_SEED:-false}" = "true" ]; then
    deploy_args+=(--seed)
fi

if [ "${MEO_CI_ALLOW_EMPTY_DB:-false}" = "true" ]; then
    deploy_args+=(--allow-empty-db)
fi

if [ "${MEO_CI_NO_CACHE:-false}" = "true" ]; then
    deploy_args+=(--no-cache)
fi

if [ "${MEO_CI_SKIP_BUILD:-false}" = "true" ]; then
    deploy_args+=(--skip-build)
fi

if [ "${MEO_CI_IGNORE_I18N_CHECKS:-false}" = "true" ]; then
    deploy_args+=(--ignore-i18n-checks)
fi

exec "$SCRIPT_DIR/deploy.sh" "${deploy_args[@]}"
