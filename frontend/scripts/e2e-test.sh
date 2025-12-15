#!/bin/bash

# E2E Test Runner Script
# Starts the necessary services and runs Playwright tests with email verification

set -euo pipefail

# --- Prerequisite checks ---
echo "🔍 Checking prerequisites..."

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ Required command not found: $1"
        exit 1
    fi
}

check_command docker
check_command curl
check_command npx

if ! docker compose version &> /dev/null; then
    echo "❌ docker compose is not available"
    exit 1
fi

# Check if required ports are available or services are already running
check_port() {
    local port=$1
    local service=$2

    local in_use=false

    if command -v lsof &> /dev/null; then
        if lsof -i ":$port" &> /dev/null; then
            in_use=true
        fi
    fi

    if command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            in_use=true
        fi
    fi

    if [ "$in_use" = true ]; then
        echo "⚠️  Port $port is in use (expected for $service if already running)"
        return 1
    fi

    return 0
}

SERVICES_RUNNING=false
if ! check_port 8000 "backend" || ! check_port 8025 "MailHog"; then
    SERVICES_RUNNING=true
    echo "ℹ️  Services appear to be running from a previous session"
fi

echo "✅ Prerequisites OK"

# --- Start services ---
echo "🚀 Starting E2E Test Environment..."

if [ "$SERVICES_RUNNING" = false ]; then
    echo "📧 Starting MailHog and other services..."
    docker compose --profile e2e up -d

    echo "⏳ Waiting for services to be ready..."
    sleep 5
else
    echo "♻️  Using existing services..."
fi

# Check if MailHog is accessible
echo "🔍 Checking MailHog availability..."
timeout 30 bash -c 'until curl -f http://localhost:8025/api/v2/messages >/dev/null 2>&1; do sleep 1; done'

# Setup test database with fresh data
echo "🗄️ Setting up test database..."
docker compose exec -T backend php artisan migrate:fresh --env=e2e
docker compose exec -T backend php artisan db:seed --class=E2ETestingSeeder --env=e2e

# Also ensure test users exist in main database (since web server uses main DB)
echo "🗄️ Ensuring test users exist in main database..."
docker compose exec -T backend php artisan db:seed --class=UserSeeder --force

# Verify email configuration
echo "📧 Verifying email configuration..."
docker compose exec -T backend php artisan email:verify-config --env=e2e

# --- Run tests ---
echo "🎭 Running Playwright E2E tests..."
PLAYWRIGHT_EXIT_CODE=0
SKIP_E2E_SETUP=true PLAYWRIGHT_BASE_URL=http://localhost:8000 npx playwright test "$@" || PLAYWRIGHT_EXIT_CODE=$?

if [ $PLAYWRIGHT_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests completed successfully!"
else
    echo "❌ E2E tests failed with exit code $PLAYWRIGHT_EXIT_CODE"
fi

exit $PLAYWRIGHT_EXIT_CODE