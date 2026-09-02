#!/usr/bin/env bash
#
# Runs the Playwright suite against either a local compose stack or the
# isolated e2e stack on the deploy host. One script for both, because a second
# implementation of "set up the database and run the tests" drifts from the
# first, and the symptom is a suite that passes locally and fails in CI for
# reasons nobody can reproduce.
#
#   utils/e2e-run.sh --target=local                     # reseeds by default
#   utils/e2e-run.sh --target=local --no-reseed         # keep local data
#   utils/e2e-run.sh --target=e2e --no-reseed --grep x  # keep the e2e fixture
#   utils/e2e-run.sh --target=e2e --yes                 # reseed, then run
#
# See docs/e2e-ci.md.

set -euo pipefail

# The deploy hands secrets over in a mode-0600 file rather than on the command
# line, because sudo logs argv to the journal verbatim. systemd has already read
# it into this process's environment by now, so the file's job is done.
if [ -n "${E2E_SECRET_ENV_FILE:-}" ]; then
    rm -f "$E2E_SECRET_ENV_FILE"
    unset E2E_SECRET_ENV_FILE
fi

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

TARGET=""
# Both targets default to reseeding: the suite asserts against seeded accounts.
# The e2e target can afford to, now that its database is its own - wiping it
# reaches no visitor. The public demo is refreshed separately by
# utils/demo-refresh.sh, which is the only thing that still needs a notice.
DO_RESEED=""
CONFIRMED="false"
INITIALIZE="false"
REPORT_ROOT="${E2E_REPORT_ROOT:-/opt/e2e-reports/meo-mai-moi}"
# Deliberately not in /tmp: Ubuntu sets fs.protected_regular=2, which stops one
# user opening another user's file in a sticky world-writable directory, so a
# lock left by a manual run blocks the automated one (and vice versa).
LOCK_FILE="${E2E_LOCK_FILE:-$REPORT_ROOT/.e2e.lock}"
# The compose service holding the suite's own database. Not backend_admin, and
# not a slot: those stand in the demo database.
E2E_SERVICE="${E2E_BACKEND_SERVICE:-backend_e2e}"
# The loopback address the e2e vhost listens on. Same hostname and port as the
# public site, different address, so the application needs no idea that a
# second copy of itself exists. See deploy/nginx/dev-e2e.conf.template.
E2E_LOOPBACK="${E2E_LOOPBACK_ADDRESS:-127.0.0.2}"
PIPELINE="${CI_PIPELINE_NUMBER:-local}"
COMMIT_SHA="${CI_COMMIT_SHA:-}"
PLAYWRIGHT_ARGS=()

# Hosts this script will consent to reseed. Mirrors config/demo.php; both must
# agree, and both fail closed.
#
# The e2e stack answers to the same URL as the public site on purpose, so this
# allowlist can no longer tell the two databases apart. The guard that can is
# DEMO_RESEED_EXPECTED_DATABASE inside the container, backed by a Postgres role
# that holds no privileges on the demo database at all.
E2E_BASE_URL="https://dev.meo-mai-moi.com"
LOCAL_BASE_URL="https://localhost"
RESEED_ALLOWED_URLS=("$E2E_BASE_URL" "$LOCAL_BASE_URL" "http://localhost:8000")
DEV_DEPLOY_PATH="${E2E_DEV_DEPLOY_PATH:-/opt/meo-mai-moi-dev}"

log()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
    sed -n '2,13p' "$SCRIPT_PATH" | sed 's/^# \{0,1\}//'
    exit "${1:-0}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --target=*)   TARGET="${1#*=}" ;;
        --target)     TARGET="${2:-}"; shift ;;
        --reseed)     DO_RESEED="true" ;;
        --no-reseed)  DO_RESEED="false" ;;
        --initialize) DO_RESEED="true"; INITIALIZE="true" ;;
        --yes|-y)     CONFIRMED="true" ;;
        -h|--help)    usage 0 ;;
        *)            PLAYWRIGHT_ARGS+=("$1") ;;
    esac
    shift
done

case "$TARGET" in
    local) BASE_URL="$LOCAL_BASE_URL"; DO_RESEED="${DO_RESEED:-true}" ;;
    e2e)   BASE_URL="$E2E_BASE_URL";   DO_RESEED="${DO_RESEED:-true}" ;;
    "")    die "--target is required (local or e2e). Try --help." ;;
    *)     die "Unknown target '$TARGET'. Use local or e2e." ;;
esac

# ---------------------------------------------------------------------------
# Guards
#
# The command being wrapped drops every table. These checks duplicate the ones
# in the artisan command on purpose: this one stops the wrong invocation before
# a container is even reached, and it is the layer that knows which *deployment*
# it is standing in, which the application cannot see from inside a container.
# ---------------------------------------------------------------------------

assert_reseed_allowed() {
    local url_ok="false"
    local candidate
    for candidate in "${RESEED_ALLOWED_URLS[@]}"; do
        [ "$candidate" = "$BASE_URL" ] && url_ok="true"
    done
    [ "$url_ok" = "true" ] || die "Refusing --reseed: $BASE_URL is not in the allowlist."

    if [ "$TARGET" = "e2e" ]; then
        # Identity by checkout path, not hostname. The deploy hosts are reached
        # through SSH aliases that do not match their real hostnames (the dev
        # box answers to a VPS-generated name), so a hostname check pins to
        # something both wrong and liable to change. The path is the deployment:
        # production lives at /srv/meo-mai-moi, development at
        # /opt/meo-mai-moi-dev, and a workstation checkout is neither.
        [ "$PROJECT_ROOT" = "$DEV_DEPLOY_PATH" ] || die \
            "Refusing --reseed: this checkout is '$PROJECT_ROOT', not the development deployment at '$DEV_DEPLOY_PATH'."

        if [ "$CONFIRMED" != "true" ]; then
            die "Refusing --reseed without --yes. This wipes $E2E_SERVICE's database."
        fi
    fi
}

# ---------------------------------------------------------------------------
# Local target
# ---------------------------------------------------------------------------

compose() { (cd "$PROJECT_ROOT" && docker compose "$@"); }

start_local_stack() {
    log "Starting local stack (db, backend, mailhog, https proxy)"
    COMPOSE_PROFILES="local-db,e2e,https" compose up -d db backend mailhog https-proxy

    note "Waiting for MailHog"
    timeout 60 bash -c 'until curl -fsS http://localhost:8025/api/v2/messages >/dev/null 2>&1; do sleep 1; done' \
        || die "MailHog did not come up."

    note "Waiting for the app over HTTPS"
    timeout 90 bash -c 'until curl -fsSk https://localhost/ >/dev/null 2>&1; do sleep 1; done' \
        || die "App did not answer on https://localhost."
}

# ---------------------------------------------------------------------------
# Dev target
# ---------------------------------------------------------------------------

# `/api/version` reports a release tag that does not move per development
# commit, so it cannot prove which commit is live. From the deploy host the
# question is answerable directly: ask the active slot's container what image
# it is running. This is the authoritative half of the deployment check.
assert_e2e_stack_image() {
    [ -n "$COMMIT_SHA" ] || { note "CI_COMMIT_SHA unset; skipping image verification."; return 0; }

    local running
    running="$(cd "$PROJECT_ROOT" && docker compose ps -q "$E2E_SERVICE" 2>/dev/null | head -n1)"

    # Returns non-zero rather than exiting: the caller needs to publish an
    # abort report and notify before giving up.
    if [ -z "$running" ]; then
        printf 'The e2e stack (%s) has no running container.\n' "$E2E_SERVICE" >&2
        return 1
    fi

    local image
    image="$(docker inspect --format '{{.Config.Image}}' "$running")"

    case "$image" in
        *"$COMMIT_SHA"*)
            note "$E2E_SERVICE runs $image"
            ;;
        *)
            printf '%s runs "%s", which does not carry %s. The deploy did not reach the e2e stack.\n' \
                "$E2E_SERVICE" "$image" "$COMMIT_SHA" >&2
            return 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Reseed
# ---------------------------------------------------------------------------

RESEED_STARTED_MARKER=""
PUBLISHED="false"

# -u www-data, never root: reseeding writes under storage/ (Media Library temp
# directories among them) and root-owned files there are unwritable by PHP-FPM.
artisan() {
    if [ "$TARGET" = "e2e" ]; then
        compose exec -T -u www-data "$E2E_SERVICE" php artisan "$@"
    else
        compose exec -T -u www-data backend php artisan "$@"
    fi
}

do_reseed() {
    assert_reseed_allowed

    RESEED_STARTED_MARKER="$(mktemp)"

    log "Reseeding the demo database"
    local args=()
    [ "$INITIALIZE" = "true" ] && args+=(--initialize)

    artisan demo:reseed "${args[@]}"

    rm -f "$RESEED_STARTED_MARKER"
    RESEED_STARTED_MARKER=""
}

# A death between the wipe and the end of seeding leaves the fixture empty and
# the next run asserting against nothing. No visitor sees it any more - that is
# what the database split bought - so this is now about the next run, not about
# the demo. See docs/e2e-ci.md.
cleanup() {
    local status=$?

    if [ -n "$RESEED_STARTED_MARKER" ] && [ -e "$RESEED_STARTED_MARKER" ]; then
        printf '\n\033[33mReseed did not complete; retrying once so the demo is not left empty.\033[0m\n'
        rm -f "$RESEED_STARTED_MARKER"
        artisan demo:reseed || printf '\033[31mRecovery reseed failed. The demo needs attention.\033[0m\n'
    fi

    # Any exit that never reached publish - a guard refusing, an unexpected
    # error, the runtime cap - must still leave a report and a notification
    # behind. This is a fire-and-forget run: nobody is watching a terminal, so
    # an unpublished failure is indistinguishable from a run that went fine.
    if [ "$TARGET" = "e2e" ] && [ "$PUBLISHED" = "false" ]; then
        touch "$RUN_DIR/.aborted" 2>/dev/null || true
        publish "$status" || true
    fi

    return "$status"
}

# ---------------------------------------------------------------------------
# Playwright
# ---------------------------------------------------------------------------

# The pinned version, read from the lockfile rather than package.json, because
# package.json carries a caret and the browsers must match what actually
# resolved. A mismatch here is the classic "works locally" CI failure.
playwright_version() {
    grep -oE '"playwright@[0-9]+\.[0-9]+\.[0-9]+"' "$FRONTEND_DIR/bun.lock" \
        | head -n1 | sed 's/.*@//; s/"//'
}

RUNNER_IMAGE=""
NODE_MODULES_VOLUME="${E2E_NODE_MODULES_VOLUME:-meo-e2e-node-modules}"

# A named volume is created root-owned, and the runner deliberately runs as the
# invoking user so it leaves no root-owned files in the checkout. Without this,
# the run dies on `bun is unable to write files: EACCES`.
#
# The ownership fix has to be idempotent rather than create-only: a run that
# failed after creating the volume leaves a root-owned one behind, and every
# later run would then skip the fix and fail identically.
ensure_node_modules_volume() {
    docker volume inspect "$NODE_MODULES_VOLUME" >/dev/null 2>&1 \
        || docker volume create "$NODE_MODULES_VOLUME" >/dev/null

    local owner
    owner="$(docker run --rm -v "$NODE_MODULES_VOLUME:/mount" alpine:3.20 \
        stat -c '%u:%g' /mount 2>/dev/null || echo 'unknown')"

    if [ "$owner" = "$(id -u):$(id -g)" ]; then
        return 0
    fi

    note "Taking ownership of $NODE_MODULES_VOLUME (was $owner)"
    docker run --rm -v "$NODE_MODULES_VOLUME:/mount" alpine:3.20 \
        chown -R "$(id -u):$(id -g)" /mount
}

ensure_runner_image() {
    local version
    version="$(playwright_version)"
    [ -n "$version" ] || die "Could not read the Playwright version from frontend/bun.lock."

    RUNNER_IMAGE="meo-e2e-runner:${version}"

    if docker image inspect "$RUNNER_IMAGE" >/dev/null 2>&1; then
        note "Runner image $RUNNER_IMAGE present"
        return 0
    fi

    log "Building runner image $RUNNER_IMAGE (Playwright bumped, or first run)"
    docker build \
        --build-arg "PLAYWRIGHT_VERSION=${version}" \
        -t "$RUNNER_IMAGE" \
        "$PROJECT_ROOT/deploy/e2e"
}

run_playwright() {
    local label="$1"; shift

    log "Playwright: $label"

    if [ "$TARGET" = "local" ]; then
        # Developers already have bun and browsers; no container in the way.
        (
            cd "$FRONTEND_DIR"
            SKIP_E2E_SETUP=true \
            PLAYWRIGHT_BASE_URL="$BASE_URL" \
            PLAYWRIGHT_HTML_OUTPUT_DIR="$RUN_DIR/$label" \
            PLAYWRIGHT_JSON_OUTPUT_NAME="$RUN_DIR/$label.json" \
            bun x playwright test "$@" "${PLAYWRIGHT_ARGS[@]}" \
                --reporter=list,html,json
        )
        return
    fi

    ensure_runner_image
    ensure_node_modules_volume

    # --network host plus the pinned hostname sends the suite to the e2e vhost
    # on 127.0.0.2 while every real visitor resolves the same name publicly and
    # reaches the demo. Same URL, same cert, same cookie domain, different
    # database - so nothing in the application has to know it is under test.
    docker run --rm \
        --network host \
        --add-host "dev.meo-mai-moi.com:$E2E_LOOPBACK" \
        --user "$(id -u):$(id -g)" \
        -v "$FRONTEND_DIR:/work" \
        -v "$NODE_MODULES_VOLUME:/work/node_modules" \
        -v "$RUN_DIR:/reports" \
        -e HOME=/tmp \
        -e CI=true \
        -e SKIP_E2E_SETUP=true \
        -e PLAYWRIGHT_BASE_URL="$BASE_URL" \
        -e PLAYWRIGHT_HTML_OUTPUT_DIR="/reports/$label" \
        -e PLAYWRIGHT_JSON_OUTPUT_NAME="/reports/$label.json" \
        -e MAILHOG_API_URL="${MAILHOG_API_URL:-http://127.0.0.1:8025/api/v2}" \
        "$RUNNER_IMAGE" \
        bash -c "bun install --frozen-lockfile >/dev/null && bun x playwright test $(printf '%q ' "$@" "${PLAYWRIGHT_ARGS[@]}") --reporter=list,html,json"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    if [ "$TARGET" = "e2e" ]; then
        RUN_DIR="$REPORT_ROOT/dev/${PIPELINE}-${COMMIT_SHA:0:7}"
    else
        RUN_DIR="${E2E_LOCAL_REPORT_DIR:-$FRONTEND_DIR/playwright-report}"
    fi
    mkdir -p "$RUN_DIR"

    trap cleanup EXIT

    if [ "$TARGET" = "local" ]; then
        start_local_stack
    else
        log "Verifying the deployment before touching anything"

        # An abort here must still produce a report and a notification. A
        # non-blocking system that goes quiet on failure is worse than none,
        # because you will read the silence as success.
        if ! assert_e2e_stack_image || ! run_playwright deployment --grep "@deployment"; then
            touch "$RUN_DIR/.aborted"
            log "Deployment check failed. The fixture was NOT wiped and the suite did not run."
            publish 1
            return 1
        fi
    fi

    if [ "$DO_RESEED" = "true" ]; then
        do_reseed
    fi

    local suite_status=0
    run_playwright suite --grep-invert "@deployment" || suite_status=$?

    publish "$suite_status"

    return "$suite_status"
}

publish() {
    [ "$TARGET" = "e2e" ] || return 0

    PUBLISHED="true"
    "$SCRIPT_DIR/e2e-report-index.sh" "$RUN_DIR" "$1" || true
    "$SCRIPT_DIR/e2e-notify.sh" "$RUN_DIR" || true
}

if [ "$TARGET" = "e2e" ]; then
    # Non-blocking: a second deployment mid-run skips rather than queueing a
    # stale result or doubling the footprint on the deploy host.
    mkdir -p "$(dirname "$LOCK_FILE")" 2>/dev/null || true
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
        log "Another e2e run is in flight; skipping this one."
        note "The demo was already refreshed by the deploy; only this test run is skipped."
        exit 0
    fi
fi

main
