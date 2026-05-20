#!/usr/bin/env bash
set -euo pipefail

slot_helper="${1:?slot helper path required}"
slot_to_retire="${2:?slot to retire required}"
ttl_minutes="${3:?ttl minutes required}"

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ ! -x "$slot_helper" ]; then
    echo "✗ Slot helper is missing or not executable: $slot_helper" >&2
    exit 1
fi

case "$ttl_minutes" in
    ''|*[!0-9]*)
        echo "✗ TTL minutes must be a non-negative integer, got: $ttl_minutes" >&2
        exit 1
        ;;
esac

service_to_retire="$("$slot_helper" service "$slot_to_retire")"
sleep_seconds=$(( ttl_minutes * 60 ))

echo "Waiting ${ttl_minutes} minute(s) before evaluating retirement for slot ${slot_to_retire} (${service_to_retire})..."
sleep "$sleep_seconds"

current_active="$("$slot_helper" active)"

if [ "$current_active" = "$slot_to_retire" ]; then
    echo "Slot ${slot_to_retire} became active again; keeping ${service_to_retire} running."
    exit 0
fi

cd "$PROJECT_ROOT"

if docker compose ps "$service_to_retire" 2>/dev/null | grep -q "Up"; then
    echo "Stopping retired slot ${slot_to_retire} (${service_to_retire}) after TTL expiry."
    docker compose stop "$service_to_retire"
else
    echo "Service ${service_to_retire} is already stopped; nothing to do."
fi
