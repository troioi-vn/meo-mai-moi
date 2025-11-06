#!/bin/bash

# shellcheck shell=bash
# Test script for Telegram notifications via deploy_notify.sh
# 
# Usage:
#   ./utils/deploy_notify_test.sh [message]
#
# Environment variables required in .env or .env.docker:
#   TELEGRAM_BOT_TOKEN
#   CHAT_ID
#   APP_URL (optional, for display prefix)

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Set default ENV_FILE, restricted to backend/.env.docker (can be overridden by pre-setting ENV_FILE)
if [ -z "${ENV_FILE:-}" ]; then
    ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Telegram Notification Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Source the deploy_notify script
if [ ! -f "$SCRIPT_DIR/deploy_notify.sh" ]; then
    echo -e "${RED}Error: deploy_notify.sh not found at $SCRIPT_DIR/deploy_notify.sh${NC}"
    exit 1
fi

source "$SCRIPT_DIR/deploy_notify.sh"

# Initialize the notification system
echo -e "${YELLOW}Initializing notification system...${NC} (env file: $ENV_FILE)"
deploy_notify_initialize

# Check if notifications are enabled
if [ "$DEPLOY_NOTIFY_ENABLED" != "true" ]; then
    echo -e "${YELLOW}Status: ${DEPLOY_NOTIFY_STATUS}${NC}"
    
    if [ "$DEPLOY_NOTIFY_STATUS" = "inactive" ]; then
        echo -e "${RED}Notifications are inactive.${NC}"
        echo ""
        echo "Required environment variables not found:"
        echo "  - TELEGRAM_BOT_TOKEN"
        echo "  - CHAT_ID"
        echo ""
        echo "Add these to your .env.docker file:"
        echo "  TELEGRAM_BOT_TOKEN=your_bot_token_here"
        echo "  CHAT_ID=your_chat_id_here"
        exit 1
    fi
    
    echo -e "${RED}Notifications are disabled. Status: $DEPLOY_NOTIFY_STATUS${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Notifications enabled${NC}"
echo -e "  Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo -e "  Chat ID: $CHAT_ID"
echo -e "  Prefix: $DEPLOY_NOTIFY_PREFIX"
echo ""

# Get test message from argument or use default
TEST_MESSAGE="${1:-Test notification from deploy_notify_test.sh at $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${YELLOW}Sending test message:${NC}"
echo "  $TEST_MESSAGE"
echo ""

# Send the test message
if deploy_notify_send "$TEST_MESSAGE"; then
    echo -e "${GREEN}✓ Message sent successfully!${NC}"
else
    echo -e "${RED}✗ Failed to send message${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Test completed!${NC}"
