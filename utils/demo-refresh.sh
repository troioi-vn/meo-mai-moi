#!/usr/bin/env bash
#
# Wipes and reseeds the public demo database behind a short maintenance notice.
#
#   utils/demo-refresh.sh --yes
#   utils/demo-refresh.sh --initialize --yes   # first run on a fresh database
#
# This used to be a side effect of the e2e run, back when the suite and the
# demo shared one database and the demo therefore had to stay down for the
# suite's whole ~10 minute run. They stand in separate databases now, so this
# is its own operation and the notice lasts as long as a reseed does - about a
# minute - instead of as long as the tests do.
#
# See docs/e2e-ci.md.

set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

MAINTENANCE_MARKER="${DEMO_MAINTENANCE_MARKER:-/var/www/dev-maintenance/on}"
DEV_DEPLOY_PATH="${DEMO_DEV_DEPLOY_PATH:-/opt/meo-mai-moi-dev}"
RESEED_SERVICE="${DEMO_RESEED_SERVICE:-backend_admin}"

CONFIRMED="false"
INITIALIZE="false"

log()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case "$1" in
        --initialize) INITIALIZE="true" ;;
        --yes|-y)     CONFIRMED="true" ;;
        -h|--help)    sed -n '2,14p' "$SCRIPT_PATH" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            die "Unknown argument '$1'." ;;
    esac
    shift
done

# Identity by checkout path, not hostname: the deploy hosts answer to
# SSH aliases that do not match their real hostnames. Production lives at
# /srv/meo-mai-moi, development at /opt/meo-mai-moi-dev, a workstation
# checkout is neither.
[ "$PROJECT_ROOT" = "$DEV_DEPLOY_PATH" ] || die \
    "Refusing: this checkout is '$PROJECT_ROOT', not the development deployment at '$DEV_DEPLOY_PATH'."

[ "$CONFIRMED" = "true" ] || die "Refusing without --yes. This wipes the public demo."

compose() { (cd "$PROJECT_ROOT" && docker compose "$@"); }

# -u www-data, never root: reseeding writes under storage/ and root-owned files
# there are unwritable by PHP-FPM afterwards.
artisan() { compose exec -T -u www-data "$RESEED_SERVICE" php artisan "$@"; }

maintenance_on() {
    mkdir -p "$(dirname "$MAINTENANCE_MARKER")"
    date -u +%Y-%m-%dT%H:%M:%SZ > "$MAINTENANCE_MARKER"
    note "Maintenance notice on ($MAINTENANCE_MARKER)"
}

maintenance_off() {
    rm -f "$MAINTENANCE_MARKER"
    note "Maintenance notice off"
}

RESEED_STARTED_MARKER=""

# A death between the wipe and the end of seeding leaves the demo empty, so the
# trap retries once. It cannot survive SIGKILL, which is why the deployment
# also carries an independent timer that clears a stale marker.
cleanup() {
    local status=$?

    if [ -n "$RESEED_STARTED_MARKER" ] && [ -e "$RESEED_STARTED_MARKER" ]; then
        printf '\n\033[33mReseed did not complete; retrying once so the demo is not left empty.\033[0m\n'
        rm -f "$RESEED_STARTED_MARKER"
        artisan demo:reseed || printf '\033[31mRecovery reseed failed. The demo needs attention.\033[0m\n'
    fi

    maintenance_off

    return "$status"
}

trap cleanup EXIT

log "Refreshing the public demo"

maintenance_on

RESEED_STARTED_MARKER="$(mktemp)"

args=()
[ "$INITIALIZE" = "true" ] && args+=(--initialize)

artisan demo:reseed "${args[@]}"

rm -f "$RESEED_STARTED_MARKER"
RESEED_STARTED_MARKER=""

log "Demo refreshed."
