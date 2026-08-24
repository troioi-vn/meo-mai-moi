#!/usr/bin/env bash
#
# POSTs one e2e run's payload to the n8n webhook.
#
#   utils/e2e-notify.sh <run-dir>
#
# This runs on the deploy host rather than in the pipeline, because the run is
# detached and the pipeline is long gone by the time there is a result. The
# webhook credentials are handed to the transient unit by the deploy step, so
# the host keeps no copy between runs.
#
# In a non-blocking system silence is indistinguishable from success, so a
# failure to notify is loud in the log rather than swallowed.
#
# See docs/e2e-ci.md.

set -euo pipefail

RUN_DIR="${1:?run directory required}"
PAYLOAD="$RUN_DIR/payload.json"

[ -f "$PAYLOAD" ] || { printf 'No payload at %s; nothing to send.\n' "$PAYLOAD" >&2; exit 1; }

if [ -z "${N8N_WEBHOOK_URL:-}" ] || [ -z "${N8N_WEBHOOK_NAME:-}" ] || [ -z "${N8N_WEBHOOK_TOKEN:-}" ]; then
    printf 'Skipping e2e notification: webhook secrets are not configured.\n'
    printf 'Payload was:\n'
    cat "$PAYLOAD"
    exit 0
fi

if curl -fsS -X POST "$N8N_WEBHOOK_URL" \
    -H "$N8N_WEBHOOK_NAME: $N8N_WEBHOOK_TOKEN" \
    -H 'Content-Type: application/json' \
    --data @"$PAYLOAD" >/dev/null
then
    printf 'e2e notification sent.\n'
else
    printf 'e2e notification FAILED. Payload:\n' >&2
    cat "$PAYLOAD" >&2
    exit 1
fi
