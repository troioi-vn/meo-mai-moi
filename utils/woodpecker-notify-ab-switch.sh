#!/usr/bin/env bash
set -eu

require_env() {
  var_name="$1"
  eval "value=\${$var_name-}"
  if [ -z "$value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
}

require_env SSH_TARGET
require_env DEPLOY_PATH
require_env SLOT_SCRIPT
require_env TARGET_LABEL
require_env SITE_LABEL
require_env N8N_WEBHOOK_URL
require_env N8N_WEBHOOK_NAME
require_env N8N_WEBHOOK_TOKEN
require_env CI_REPO
require_env CI_COMMIT_BRANCH
require_env CI_PIPELINE_NUMBER
require_env CI_COMMIT_SHA
require_env CI_COMMIT_MESSAGE

switch_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
commit_message_b64="$(printf '%s\n' "${CI_COMMIT_MESSAGE}" | head -n 1 | tr '\t' ' ' | tr -s ' ' | sed 's/^ //; s/ $//' | base64 | tr -d '\n')"

slot_info="$(ssh -i ~/.ssh/id_ed25519 "$SSH_TARGET" "cd '$DEPLOY_PATH' && active_slot=\$(./utils/$SLOT_SCRIPT active) && previous_slot=\$(./utils/$SLOT_SCRIPT inactive) && service_name=\$(./utils/$SLOT_SCRIPT service \"\$active_slot\") && backend_port=\$(./utils/$SLOT_SCRIPT backend-port \"\$active_slot\") && reverb_port=\$(./utils/$SLOT_SCRIPT reverb-port \"\$active_slot\") && printf 'from_slot=%s\nto_slot=%s\nservice_name=%s\nbackend_port=%s\nreverb_port=%s\n' \"\$previous_slot\" \"\$active_slot\" \"\$service_name\" \"\$backend_port\" \"\$reverb_port\"")"

from_slot=""
to_slot=""
service_name=""
backend_port=""
reverb_port=""
slot_info_file="$(mktemp)"
printf '%s\n' "$slot_info" > "$slot_info_file"
while IFS='=' read -r key value; do
  case "$key" in
    from_slot) from_slot="$value" ;;
    to_slot) to_slot="$value" ;;
    service_name) service_name="$value" ;;
    backend_port) backend_port="$value" ;;
    reverb_port) reverb_port="$value" ;;
  esac
done < "$slot_info_file"
rm -f "$slot_info_file"

payload_file="$(mktemp)"
jq -n \
  --arg event "deploy" \
  --arg phase "ab_switch" \
  --arg status "success" \
  --arg source "woodpecker" \
  --arg repo "$CI_REPO" \
  --arg branch "$CI_COMMIT_BRANCH" \
  --arg pipeline_number "$CI_PIPELINE_NUMBER" \
  --arg commit_message_b64 "$commit_message_b64" \
  --arg commit_sha "$CI_COMMIT_SHA" \
  --arg target "$TARGET_LABEL" \
  --arg site "$SITE_LABEL" \
  --arg from_slot "$from_slot" \
  --arg to_slot "$to_slot" \
  --arg service "$service_name" \
  --arg backend_port "$backend_port" \
  --arg reverb_port "$reverb_port" \
  --arg switched_at_utc "$switch_utc" \
  --arg sent_at_utc "$switch_utc" \
  '{
    event: $event,
    phase: $phase,
    status: $status,
    source: $source,
    repo: $repo,
    branch: $branch,
    pipeline_number: $pipeline_number,
    commit_message_b64: $commit_message_b64,
    commit_sha: $commit_sha,
    target: $target,
    site: $site,
    from_slot: $from_slot,
    to_slot: $to_slot,
    service: $service,
    backend_port: $backend_port,
    reverb_port: $reverb_port,
    switched_at_utc: $switched_at_utc,
    sent_at_utc: $sent_at_utc
  }' > "$payload_file"

curl -fsS -X POST \
  "$N8N_WEBHOOK_URL" \
  -H "$N8N_WEBHOOK_NAME: $N8N_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  --data @"$payload_file"
curl_status=$?
if [ "$curl_status" -ne 0 ]; then
  echo "A/B switch notification failed; continuing."
fi
rm -f "$payload_file"

start_epoch="$(cat .woodpecker-deploy-start-epoch 2>/dev/null || true)"
finish_epoch="$(date -u +%s)"
finish_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -n "$start_epoch" ]; then
  duration_seconds=$((finish_epoch - start_epoch))
else
  duration_seconds=null
fi

payload_file="$(mktemp)"
jq -n \
  --arg event "deploy" \
  --arg phase "finish" \
  --arg status "success" \
  --arg source "woodpecker" \
  --arg repo "$CI_REPO" \
  --arg branch "$CI_COMMIT_BRANCH" \
  --arg pipeline_number "$CI_PIPELINE_NUMBER" \
  --arg commit_message_b64 "$commit_message_b64" \
  --arg commit_sha "$CI_COMMIT_SHA" \
  --arg target "$TARGET_LABEL" \
  --arg site "$SITE_LABEL" \
  --arg finished_at_utc "$finish_utc" \
  --arg sent_at_utc "$finish_utc" \
  --argjson finished_at_unix "$finish_epoch" \
  --argjson duration_seconds "$duration_seconds" \
  '{
    event: $event,
    phase: $phase,
    status: $status,
    source: $source,
    repo: $repo,
    branch: $branch,
    pipeline_number: $pipeline_number,
    commit_message_b64: $commit_message_b64,
    commit_sha: $commit_sha,
    target: $target,
    site: $site,
    finished_at_utc: $finished_at_utc,
    finished_at_unix: $finished_at_unix,
    duration_seconds: $duration_seconds,
    sent_at_utc: $sent_at_utc
  }' > "$payload_file"

curl -fsS -X POST \
  "$N8N_WEBHOOK_URL" \
  -H "$N8N_WEBHOOK_NAME: $N8N_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  --data @"$payload_file"
curl_status=$?
if [ "$curl_status" -ne 0 ]; then
  echo "Deploy success notification failed; continuing."
fi
rm -f "$payload_file"
rm -f .woodpecker-deploy-start-epoch
