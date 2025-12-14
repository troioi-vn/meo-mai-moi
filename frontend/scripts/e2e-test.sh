#!/bin/bash

# E2E Test Runner Script
# Starts the necessary services and runs Playwright tests with email verification

set -e

echo "🚀 Starting E2E Test Environment..."

# Start services with e2e profile (includes MailHog)
echo "📧 Starting MailHog and other services..."
docker compose --profile e2e up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if MailHog is accessible
echo "🔍 Checking MailHog availability..."
timeout 30 bash -c 'until curl -f http://localhost:8025/api/v2/messages >/dev/null 2>&1; do sleep 1; done'

# Setup test database with fresh data
echo "🗄️ Setting up test database..."
docker compose exec backend php artisan migrate:fresh --env=e2e
docker compose exec backend php artisan db:seed --class=E2ETestingSeeder --env=e2e

# Verify email configuration
echo "📧 Verifying email configuration..."
docker compose exec backend php artisan email:verify-config --env=e2e

# Run Playwright tests
echo "🎭 Running Playwright E2E tests..."
# Pass all arguments except --keep-running to Playwright
PLAYWRIGHT_ARGS=()
for arg in "$@"; do
    if [[ "$arg" != "--keep-running" ]]; then
        PLAYWRIGHT_ARGS+=("$arg")
    fi
done

PLAYWRIGHT_BASE_URL=http://localhost:8000 npx playwright test "${PLAYWRIGHT_ARGS[@]}"

echo "✅ E2E tests completed!"

# Optional: Keep services running for debugging
if [[ "$1" == "--keep-running" ]]; then
    echo "🔧 Services are still running for debugging:"
    echo "   - App: http://localhost:8000"
    echo "   - MailHog UI: http://localhost:8025"
    echo "   - Stop with: docker compose --profile e2e down"
else
    echo "🧹 Cleaning up services..."
    docker compose --profile e2e down
fi