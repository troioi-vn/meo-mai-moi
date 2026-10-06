#!/usr/bin/env bash
# Runs on the deploy host, fed over SSH by the deploy pipelines:
#
#   ssh host "bash -s -- <lock name> <base64 command>" < utils/ci-detached.sh
#
# Woodpecker cancels a running pipeline when a newer push arrives. The deploy
# used to run inside the SSH session, so a cancel killed it mid-run, and the
# next pipeline's `git reset --hard` rewrote the checkout under a deploy still
# running -- deploy.sh takes its own lock only after the reset. Here the whole
# command, reset included, runs detached under one lock; this session only
# streams the log. A cancel ends the stream, never the deploy.
set -euo pipefail

lock_name=${1:?lock name required}
command_b64=${2:?base64 command required}

# A cancelled run never reaches the rm below and leaves its log behind for
# forensics; a week is long enough to read it.
find /tmp -maxdepth 1 -name 'meo-deploy.*' -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
run_dir="$(mktemp -d /tmp/meo-deploy.XXXXXX)"
log="$run_dir/log"
: > "$log"
printf '%s' "$command_b64" | base64 -d > "$run_dir/command"

# shellcheck disable=SC2016 # expanded by the detached bash, not here
setsid nohup bash -c '
  run_dir=$1
  echo "Waiting for the deploy lock..."
  if ! flock -w 1800 9; then
    echo "another deploy held the lock for 30 minutes; giving up" >&2
    echo 1 > "$run_dir/status"
    exit
  fi
  bash "$run_dir/command"
  echo $? > "$run_dir/status"
' _ "$run_dir" \
  9>"/run/lock/meo-deploy-${lock_name}.lock" >"$log" 2>&1 </dev/null &

tail -n +1 -f --pid=$! "$log"
status="$(cat "$run_dir/status" 2>/dev/null || echo 1)"
rm -rf "$run_dir"
exit "$status"
