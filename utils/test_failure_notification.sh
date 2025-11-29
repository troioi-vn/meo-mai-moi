#!/bin/bash
# Test script to verify failure notification includes detailed context

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"
DEPLOY_LOG="/tmp/test_deploy_failure.log"

# Create a fake log with some errors
cat > "$DEPLOY_LOG" << 'EOF'
[2025-11-08 10:15:32] Starting deployment...
[2025-11-08 10:15:45] Building Docker images...
[2025-11-08 10:16:12] ✓ Images built successfully
[2025-11-08 10:16:20] Running migrations...
✗ Migration failed: Syntax error in migration file
ERROR: Column 'user_id' does not exist in table 'posts'
failed to execute migration 2025_11_08_create_comments_table
EOF

# Source the notification system
source "$SCRIPT_DIR/deploy_notify.sh"

echo "Testing failure notification with detailed context..."
echo ""

deploy_notify_initialize

if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
    echo "⚠️  Notifications not enabled. Set TELEGRAM_BOT_TOKEN and CHAT_ID in backend/.env"
    exit 1
fi

echo "✓ Notifications enabled"
echo ""

# Simulate deployment start
DEPLOY_NOTIFY_STARTED_AT=$(deploy_notify_now)
echo "Started at: $DEPLOY_NOTIFY_STARTED_AT"

# Wait a bit to simulate deployment time
sleep 2

# Simulate failure with exit code
DEPLOY_EXIT_CODE=1
echo "Sending failure notification with exit code $DEPLOY_EXIT_CODE..."
echo ""

deploy_notify_send_failure

echo ""
echo "✓ Test complete. Check Telegram for failure notification with:"
echo "  - Duration"
echo "  - Exit code: $DEPLOY_EXIT_CODE"
echo "  - Last errors from log"
echo "  - Git commit info"

# Cleanup
rm -f "$DEPLOY_LOG"
