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
OLD_SLOT_TTL_MINUTES="${AB_OLD_SLOT_TTL_MINUTES:-30}"

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

if [ ! -f "$SCRIPT_DIR/ab-slot-retire.sh" ]; then
    echo "✗ ab-slot-retire.sh is missing at $SCRIPT_DIR/ab-slot-retire.sh" >&2
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/demo-refresh.sh" ]; then
    echo "✗ demo-refresh.sh is missing at $SCRIPT_DIR/demo-refresh.sh" >&2
    exit 1
fi

# AB_OLD_SLOT_TTL_MINUTES:
#   N > 0  retire the previous slot N minutes after the switch
#   0      stop it immediately, as soon as nginx has switched
#   -1     keep it running indefinitely
#
# 0 used to mean "keep forever", which reads backwards to everyone who meets it
# and cost a host both slots running for want of a second opinion. The
# indefinite case now says so explicitly.
case "$OLD_SLOT_TTL_MINUTES" in
    -1)
        ;;
    ''|*[!0-9]*)
        echo "⚠️  Invalid AB_OLD_SLOT_TTL_MINUTES='$OLD_SLOT_TTL_MINUTES'; defaulting to 30 minutes." >&2
        OLD_SLOT_TTL_MINUTES=30
        ;;
esac

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

schedule_old_slot_retirement() {
    local previous_slot="$1"
    local previous_service
    previous_service="$("$SCRIPT_DIR/dev-slot.sh" service "$previous_slot")"

    if ! docker compose ps "$previous_service" 2>/dev/null | grep -q "Up"; then
        echo "Previous slot service $previous_service is not running; nothing to retire."
        return 0
    fi

    if [ "$OLD_SLOT_TTL_MINUTES" -eq -1 ]; then
        echo "AB_OLD_SLOT_TTL_MINUTES=-1; keeping previous slot $previous_slot ($previous_service) running indefinitely."
        return 0
    fi

    if [ "$OLD_SLOT_TTL_MINUTES" -eq 0 ]; then
        echo "AB_OLD_SLOT_TTL_MINUTES=0; stopping previous slot $previous_slot ($previous_service) now."
        docker compose stop "$previous_service" || true
        return 0
    fi

    local retire_log
    retire_log="/tmp/meo-ab-retire-dev-${previous_slot}-$(date +%s).log"

    echo "Scheduling previous slot $previous_slot ($previous_service) to stop in ${OLD_SLOT_TTL_MINUTES} minute(s)."
    echo "  Retirement log: $retire_log"

    nohup bash "$SCRIPT_DIR/ab-slot-retire.sh" "$SCRIPT_DIR/dev-slot.sh" "$previous_slot" "$OLD_SLOT_TTL_MINUTES" >"$retire_log" 2>&1 </dev/null &
}

active_slot="$("$SCRIPT_DIR/dev-slot.sh" active)"
inactive_slot="$("$SCRIPT_DIR/dev-slot.sh" inactive)"
active_service="$("$SCRIPT_DIR/dev-slot.sh" service "$active_slot")"
target_service="$("$SCRIPT_DIR/dev-slot.sh" service "$inactive_slot")"
target_backend_port="$("$SCRIPT_DIR/dev-slot.sh" backend-port "$inactive_slot")"
target_reverb_port="$("$SCRIPT_DIR/dev-slot.sh" reverb-port "$inactive_slot")"

echo "Starting CI A/B deployment for dev environment"
echo "  Active slot:   $active_slot"
echo "  Target slot:   $inactive_slot"
echo "  Active service: $active_service"
echo "  Target service: $target_service"
echo "  Target ports:  backend=$target_backend_port reverb=$target_reverb_port"
if [ -n "$CURRENT_COMMIT" ]; then
    echo "  Commit:        $CURRENT_COMMIT"
fi

if docker compose ps "$active_service" 2>/dev/null | grep -q "Up"; then
    echo "Detected active slot container $active_service."
    echo "Stopping legacy single-backend service before target slot rollout to avoid host-port collisions..."
    docker compose stop backend 2>/dev/null || true
fi

export DEPLOY_BACKEND_SERVICE="$target_service"
export DEPLOY_BACKEND_HOST_PORT="$target_backend_port"
export DEPLOY_COMPOSE_PROFILES="slot-$inactive_slot"
export ADMIN_HOST_BIND="${ADMIN_HOST_BIND:-127.0.0.1}"
export ADMIN_HOST_PORT="${ADMIN_HOST_PORT:-8003}"

run_deploy_with_lock_retry

echo "Switching nginx to slot $inactive_slot..."
"$SCRIPT_DIR/dev-slot.sh" activate "$inactive_slot"

if [ -x "$SCRIPT_DIR/dev-admin-nginx.sh" ]; then
    echo "Installing dev admin nginx vhost..."
    "$SCRIPT_DIR/dev-admin-nginx.sh" install
fi

# The suite's own stack. It stands in its own database, so it is brought up
# after the switch and never blocks time-to-live: the site above is already
# serving the new commit by this point.
#
# Failures here must not fail the deployment. A broken e2e stack costs test
# coverage, which is exactly the trade the database split was for - before it,
# the same failure would have left the public demo behind a maintenance page.
bring_up_e2e_stack() {
    echo "Bringing up the e2e stack on the deployed image..."
    docker compose --profile e2e-stack up -d backend_e2e mailhog

    if [ -x "$SCRIPT_DIR/e2e-app-nginx.sh" ]; then
        echo "Installing the e2e nginx vhost..."
        "$SCRIPT_DIR/e2e-app-nginx.sh" install
    fi
}

bring_up_e2e_stack || echo "⚠️  Could not bring up the e2e stack; the deployment itself is unaffected."

# The public demo's data refresh, behind a short notice. This is the only part
# of a deploy a visitor sees, and it now lasts as long as a reseed does rather
# than as long as the test suite does - the two were the same operation while
# they shared a database.
refresh_demo() {
    local enabled="${DEMO_REFRESH_ON_DEPLOY:-}"

    if [ -z "$enabled" ] && [ -f "$PROJECT_ROOT/.env" ]; then
        enabled="$(
            { grep -E '^DEMO_REFRESH_ON_DEPLOY=' "$PROJECT_ROOT/.env" || true; } \
                | tail -n1 | cut -d '=' -f2- | tr -d '\r' \
                | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
        )"
    fi

    if [ "${enabled:-false}" != "true" ]; then
        echo "Skipping demo refresh (DEMO_REFRESH_ON_DEPLOY is not true)."
        return 0
    fi

    "$SCRIPT_DIR/demo-refresh.sh" --yes
}

refresh_demo || echo "⚠️  Demo refresh failed; the deployment itself is unaffected."

schedule_old_slot_retirement "$active_slot"

echo "Stopping legacy single-backend service if it is still running..."
docker compose stop backend 2>/dev/null || true

echo "A/B deployment complete. Active slot is now $inactive_slot."

launch_e2e() {
    # Fire and forget. The deployment is already live at this point — nginx has
    # switched — so nothing below affects time to live. Detaching keeps the
    # pipeline from holding a Woodpecker workflow slot for the duration, and
    # means cancelling the pipeline cannot kill a run mid-wipe.
    #
    # The runner reseeds its own database before testing. That database is not
    # the demo's, so this no longer takes anything public down - which is why
    # it can run after the switch without costing anyone a wait.
    #
    # Off unless the host says otherwise. The run needs prerequisites that live
    # on the host rather than in this repo — the e2e database and its Postgres
    # role, the e2e vhost, the report vhost, MailHog, DEMO_RESEED_ALLOWED, and
    # one manual --initialize to write the sentinel — so the first deploy
    # carrying this code must not fire a half-configured run. Enable it by
    # setting E2E_AFTER_DEPLOY=true in the deployment's root .env once those are
    # in place. See docs/e2e-ci.md.
    local enabled="${E2E_AFTER_DEPLOY:-}"

    if [ -z "$enabled" ] && [ -f "$PROJECT_ROOT/.env" ]; then
        enabled="$(
            { grep -E '^E2E_AFTER_DEPLOY=' "$PROJECT_ROOT/.env" || true; } \
                | tail -n1 | cut -d '=' -f2- | tr -d '\r' \
                | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
        )"
    fi

    if [ "${enabled:-false}" != "true" ]; then
        echo "Skipping post-deploy e2e run (E2E_AFTER_DEPLOY is not true)."
        return 0
    fi

    if [ ! -x "$SCRIPT_DIR/e2e-run.sh" ]; then
        echo "Skipping post-deploy e2e run: utils/e2e-run.sh is not executable."
        return 0
    fi

    if ! command -v systemd-run >/dev/null 2>&1; then
        echo "Skipping post-deploy e2e run: systemd-run is unavailable."
        return 0
    fi

    local unit="meo-e2e-${CI_PIPELINE_NUMBER:-manual}-$(date +%s)"

    echo "Launching detached e2e run as unit $unit"
    echo "  Follow it with: journalctl -u $unit -f"

    # RuntimeMaxSec is the outer bound on a wedged run, not a target. Measured:
    # the first full run against dev took 12.4 minutes - far longer than the
    # ~4 minutes the suite takes locally, because every request is real HTTPS
    # and CI retries each failure twice. 900s would have killed it mid-suite,
    # so the bound is 30 minutes.
    #
    # A hard kill now costs a half-seeded test fixture rather than a public
    # demo stuck behind a notice; the demo's own window is closed by the trap
    # in demo-refresh.sh long before this bound matters.
    # Secrets go in a mode-0600 file, never on the command line: sudo records
    # argv in the journal verbatim, so --setenv would persist the webhook token
    # in plain text on this host. The runner deletes the file as soon as systemd
    # has loaded it into the unit environment.
    # mktemp, not /run: /run is root-owned 0755 and the deploy user cannot
    # write there. systemd reads the file as root, and the unit now runs as the
    # deploy user, so an owner-only temp file suits both.
    local secret_env
    secret_env="$(mktemp "${TMPDIR:-/tmp}/meo-e2e-secrets.XXXXXX")" || {
        echo "Could not create the e2e secret file; skipping the run."
        return 0
    }
    chmod 600 "$secret_env"
    if ! printf '%s\n' \
        "N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL:-}" \
        "N8N_WEBHOOK_NAME=${N8N_WEBHOOK_NAME:-}" \
        "N8N_WEBHOOK_TOKEN=${N8N_WEBHOOK_TOKEN:-}" > "$secret_env"
    then
        rm -f "$secret_env"
        echo "Could not write the e2e secret file; skipping the run."
        return 0
    fi

    # --uid/--gid matter: a transient unit runs as root by default, but every
    # directory, volume and lock this runner touches is owned by the deploy
    # user. Running as root re-creates the ownership problems and trips
    # fs.protected_regular on any file the deploy user already made.
    sudo -n systemd-run \
        --unit="$unit" \
        --collect \
        --uid="$(id -un)" \
        --gid="$(id -gn)" \
        --property=RuntimeMaxSec=1800 \
        --property=EnvironmentFile="$secret_env" \
        --working-directory="$PROJECT_ROOT" \
        --setenv=E2E_SECRET_ENV_FILE="$secret_env" \
        --setenv=CI_COMMIT_SHA="${CI_COMMIT_SHA:-}" \
        --setenv=CI_COMMIT_BRANCH="${CI_COMMIT_BRANCH:-dev}" \
        --setenv=CI_PIPELINE_NUMBER="${CI_PIPELINE_NUMBER:-manual}" \
        --setenv=CI_REPO="${CI_REPO:-}" \
        "$SCRIPT_DIR/e2e-run.sh" --target=e2e --reseed --yes \
        || echo "Could not launch the e2e run; the deployment itself is unaffected."
}

# The deployment is live before this point - nginx has already switched - so a
# problem launching the observability run must never mark the deploy failed.
# An earlier version let a failed write abort the script under `set -e`, which
# turned a working deployment into a red pipeline.
launch_e2e || echo "Post-deploy e2e launch failed; the deployment itself is unaffected."
