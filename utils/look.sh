#!/usr/bin/env bash
# Screenshot the running local app. See docs/development.md#looking-at-the-app.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$root/frontend/scripts/look.mjs" "$@"
