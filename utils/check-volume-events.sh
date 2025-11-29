#!/usr/bin/env bash
# Check Docker volume events for database volume recreation
# Usage: ./utils/check-volume-events.sh [days-back] [volume-name]

set -euo pipefail

DAYS_BACK="${1:-7}"
VOLUME_NAME="${2:-meo-mai-moi_pgdata}"

# Calculate the start time
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    START_TIME=$(date -u -v-"${DAYS_BACK}"d '+%Y-%m-%dT%H:%M:%S')
else
    # Linux
    START_TIME=$(date -u -d "${DAYS_BACK} days ago" '+%Y-%m-%dT%H:%M:%S')
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Docker Volume Events for: $VOLUME_NAME"
echo "Time range: Last $DAYS_BACK days (since $START_TIME)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get volume events (note: docker events without --until can hang, so we use current time)
NOW_TIME=$(date -u '+%Y-%m-%dT%H:%M:%S')
EVENTS=$(timeout 5 docker events --since "$START_TIME" --until "$NOW_TIME" --filter "type=volume" --filter "volume=$VOLUME_NAME" --format '{{.Time}} | {{.Action}} | {{.Actor.Attributes.driver}}' 2>/dev/null || echo "")

if [ -z "$EVENTS" ]; then
    echo "⚠️  No volume events found for '$VOLUME_NAME'"
    echo ""
    echo "Possible reasons:"
    echo "  • Docker event log has been rotated/cleared (events are ephemeral)"
    echo "  • Volume was never created/destroyed in this timeframe"
    echo "  • Volume name is incorrect"
    echo ""
    echo "Current volumes matching pattern:"
    docker volume ls --filter "name=meo-mai-moi" --format "  • {{.Name}} (created: {{.CreatedAt}})" 2>/dev/null || echo "  None found"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💡 Tips for catching volume deletions:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Monitor volume events in real-time (run in separate terminal):"
    echo "   docker events --filter 'type=volume' --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'"
    echo ""
    echo "2. Check the volume deletion log:"
    echo "   cat .deploy/volume-deletions.log"
    echo ""
    echo "3. Compare current volume creation time with previous:"
    echo "   docker volume inspect meo-mai-moi_pgdata --format '{{ .CreatedAt }}'"
    echo "   cat .db_volume_fingerprint"
    echo ""
    exit 0
fi

echo "📋 Volume Events (chronological order):"
echo ""

# Parse and display events with better formatting
DESTROY_TIME=""
CREATE_TIME=""

while IFS='|' read -r timestamp action _driver; do
    timestamp=$(echo "$timestamp" | xargs)
    action=$(echo "$action" | xargs)
    
    # Convert timestamp to local time if possible
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local_time=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$timestamp" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || echo "$timestamp")
    else
        local_time=$(date -d "$timestamp" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || echo "$timestamp")
    fi
    
    case "$action" in
        create)
            echo "  🟢 CREATED  │ $local_time"
            CREATE_TIME="$local_time"
            ;;
        destroy)
            echo "  🔴 DESTROYED│ $local_time"
            DESTROY_TIME="$local_time"
            ;;
        mount)
            echo "  📌 MOUNTED  │ $local_time"
            ;;
        unmount)
            echo "  📍 UNMOUNTED│ $local_time"
            ;;
        *)
            echo "  ❓ $action │ $local_time"
            ;;
    esac
done <<< "$EVENTS"

echo ""

# Analyze patterns
if [ -n "$DESTROY_TIME" ] && [ -n "$CREATE_TIME" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  VOLUME RECREATION DETECTED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Destroyed: $DESTROY_TIME"
    echo "  Recreated: $CREATE_TIME"
    echo ""
    echo "This indicates data loss likely occurred!"
    echo ""
fi

# Check all project volumes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "All Project Volumes Events:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ALL_EVENTS=$(timeout 5 docker events --since "$START_TIME" --until "$NOW_TIME" --filter "type=volume" --format '{{.Time}} | {{.Action}} | {{.Actor.Attributes.name}}' 2>/dev/null | grep -i "meo-mai-moi" || echo "")

if [ -n "$ALL_EVENTS" ]; then
    echo "Volume Name                    | Action     | Timestamp"
    echo "────────────────────────────────────────────────────────────"
    while IFS='|' read -r timestamp action volume; do
        timestamp=$(echo "$timestamp" | xargs)
        action=$(echo "$action" | xargs)
        volume=$(echo "$volume" | xargs)
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            local_time=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$timestamp" "+%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
        else
            local_time=$(date -d "$timestamp" "+%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
        fi
        
        printf "%-30s | %-10s | %s\n" "${volume:0:30}" "$action" "$local_time"
    done <<< "$ALL_EVENTS"
else
    echo "No volume events found for any meo-mai-moi volumes"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
