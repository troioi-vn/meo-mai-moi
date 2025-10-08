#!/usr/bin/env bash
set -euo pipefail

# Runs backend tests with coverage inside the running backend container (docker-compose service name: backend)
# Usage: ./backend/scripts/run-coverage.sh
# Ensure the image was built with Xdebug and dev dependencies:
#   docker compose build --build-arg INSTALL_XDEBUG=true --build-arg INSTALL_DEV=true backend
#   docker compose up -d backend

SERVICE=backend
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! docker compose ps --services --status=running | grep -q "^${SERVICE}$"; then
  echo "[ERROR] Backend service not running. Start it first: docker compose up -d backend" >&2
  exit 1
fi

# Run tests with coverage inside the container
XDEBUG_MODE=coverage docker compose exec -T ${SERVICE} php -v >/dev/null || {
  echo "[ERROR] Unable to exec into backend container." >&2; exit 1; }

XDEBUG_MODE=coverage docker compose exec -T ${SERVICE} ./vendor/bin/phpunit \
  --coverage-clover coverage-clover.xml \
  --coverage-html coverage-html \
  --colors=never || RC=$? || true

if [ -n "${RC:-}" ] && [ "${RC}" -ne 0 ]; then
  echo "[WARN] PHPUnit exited with status ${RC}. Check above output." >&2
fi

# Copy coverage artifacts out if desired (they will reside in container volume /var/www)
# On bind mount setups they are already available locally inside backend/.

echo "Coverage artifacts: backend/coverage-clover.xml & backend/coverage-html/index.html"
