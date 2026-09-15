#!/usr/bin/env bash
# Seed a fresh database and serve the built app for the @smoke Playwright tests.
#
#   APP_URL=http://app:8000 ./utils/e2e-smoke-serve.sh
#
# This is the pull-request gate's app, not a deployment: `php artisan serve`, no
# nginx, no queue worker, no MailHog. It expects a built frontend in
# backend/public/build (`bun run build:docker` in frontend/) and a Postgres named
# by the usual DB_* variables. It wipes that database, so never point it at one
# you care about. Only tests tagged @smoke are written to pass against it.
set -euo pipefail

cd "$(dirname "$0")/../backend"

if [ ! -f public/build/.vite/manifest.json ] || [ ! -f resources/views/welcome.blade.php ]; then
  echo "No built frontend. Run 'bun run build:docker' in frontend/ first." >&2
  exit 1
fi

export APP_ENV="${APP_ENV:-e2e}"
export APP_DEBUG="${APP_DEBUG:-true}"
export APP_URL="${APP_URL:-http://127.0.0.1:8000}"
# Links and the /requests shell redirect compare against the frontend host, and
# the SPA is served from this same origin.
export FRONTEND_URL="${FRONTEND_URL:-$APP_URL}"
# Sanctum only issues session cookies to hosts it lists; the port counts.
export SANCTUM_STATEFUL_DOMAINS="${SANCTUM_STATEFUL_DOMAINS:-${APP_URL#*://}}"
export SESSION_DRIVER="${SESSION_DRIVER:-database}"
export SESSION_SECURE_COOKIE=false
export CACHE_STORE="${CACHE_STORE:-database}"
export QUEUE_CONNECTION=sync
export MAIL_MAILER=log
export BROADCAST_CONNECTION=log
export TELESCOPE_ENABLED=false
export PULSE_ENABLED=false
export DB_CONNECTION=pgsql
# A throwaway key per run: nothing encrypted here outlives the process.
if [ -z "${APP_KEY:-}" ]; then
  APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
  export APP_KEY
fi

php artisan migrate:fresh --force --no-interaction
php artisan db:seed --class=E2ETestingSeeder --force --no-interaction

# The built-in server handles one request at a time unless told otherwise, and a
# page load fans out into several API calls.
export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}"
host="${APP_URL#*://}"
exec php artisan serve --host=0.0.0.0 --port="${host##*:}" --no-reload
