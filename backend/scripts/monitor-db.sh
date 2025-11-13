#!/bin/sh
# Database monitoring script - runs inside backend container
# Checks user count every minute and sends Telegram alert if database goes empty

set -e

# Configuration
CHECK_INTERVAL=${DB_MONITOR_INTERVAL:-60}
LOG_FILE="/var/www/storage/logs/db-monitor.log"
STATE_FILE="/var/www/storage/logs/db-monitor-state.txt"

# Read Telegram config from .env
if [ -f /var/www/.env ]; then
    TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' /var/www/.env | cut -d '=' -f2-)
    TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' /var/www/.env | cut -d '=' -f2-)
fi

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

send_telegram() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" > /dev/null 2>&1 || true
    fi
}

get_db_stats() {
    php artisan tinker --execute="
        \$users = DB::table('users')->count();
        \$pets = DB::table('pets')->count();
        \$roles = DB::table('roles')->count();
        echo json_encode(['users' => \$users, 'pets' => \$pets, 'roles' => \$roles]);
    " 2>/dev/null || echo '{"users":null,"pets":null,"roles":null}'
}

log_message "=== DB Monitor Started ==="
log_message "Check interval: ${CHECK_INTERVAL}s"
log_message "Log file: ${LOG_FILE}"

# Initialize state if not exists
if [ ! -f "$STATE_FILE" ]; then
    echo "healthy" > "$STATE_FILE"
fi

PREVIOUS_STATE=$(cat "$STATE_FILE")

while true; do
    # Get current stats
    STATS=$(get_db_stats)
    USER_COUNT=$(echo "$STATS" | grep -o '"users":[0-9]*' | cut -d ':' -f2)
    PET_COUNT=$(echo "$STATS" | grep -o '"pets":[0-9]*' | cut -d ':' -f2)
    ROLE_COUNT=$(echo "$STATS" | grep -o '"roles":[0-9]*' | cut -d ':' -f2)
    
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ -z "$USER_COUNT" ] || [ "$USER_COUNT" = "null" ]; then
        log_message "WARNING: Cannot query database"
        STATE="error"
    elif [ "$USER_COUNT" = "0" ] && [ "$ROLE_COUNT" = "0" ]; then
        log_message "ALERT: Database is EMPTY - users=$USER_COUNT, pets=$PET_COUNT, roles=$ROLE_COUNT"
        STATE="empty"
        
        # Send alert if state changed from healthy to empty
        if [ "$PREVIOUS_STATE" != "empty" ]; then
            MESSAGE="🚨 <b>DATABASE WIPEOUT DETECTED</b>%0A%0A"
            MESSAGE="${MESSAGE}Time: ${TIMESTAMP}%0A"
            MESSAGE="${MESSAGE}Users: ${USER_COUNT}%0A"
            MESSAGE="${MESSAGE}Pets: ${PET_COUNT}%0A"
            MESSAGE="${MESSAGE}Roles: ${ROLE_COUNT}%0A%0A"
            MESSAGE="${MESSAGE}Previous state: ${PREVIOUS_STATE}%0A%0A"
            MESSAGE="${MESSAGE}Container uptime: $(cat /proc/uptime | cut -d' ' -f1)s%0A"
            MESSAGE="${MESSAGE}Host: $(hostname)"
            
            send_telegram "$MESSAGE"
            log_message "Telegram alert sent"
            
            # Capture additional diagnostics
            log_message "=== DIAGNOSTICS ==="
            log_message "Recent Laravel logs:"
            tail -50 /var/www/storage/logs/laravel.log >> "$LOG_FILE" 2>&1 || echo "No Laravel logs" >> "$LOG_FILE"
            
            log_message "Active database connections:"
            php artisan tinker --execute="
                \$connections = DB::select('SELECT count(*) as cnt FROM pg_stat_activity WHERE datname = ? AND state = ?', [env('DB_DATABASE'), 'active']);
                echo 'Active: ' . \$connections[0]->cnt;
            " >> "$LOG_FILE" 2>&1 || echo "Cannot query connections" >> "$LOG_FILE"
        fi
    else
        log_message "OK: users=$USER_COUNT, pets=$PET_COUNT, roles=$ROLE_COUNT"
        STATE="healthy"
        
        # Send recovery notification if state changed from empty to healthy
        if [ "$PREVIOUS_STATE" = "empty" ]; then
            MESSAGE="✅ <b>Database Recovered</b>%0A%0A"
            MESSAGE="${MESSAGE}Time: ${TIMESTAMP}%0A"
            MESSAGE="${MESSAGE}Users: ${USER_COUNT}%0A"
            MESSAGE="${MESSAGE}Pets: ${PET_COUNT}%0A"
            MESSAGE="${MESSAGE}Roles: ${ROLE_COUNT}"
            
            send_telegram "$MESSAGE"
            log_message "Recovery notification sent"
        fi
    fi
    
    # Update state
    echo "$STATE" > "$STATE_FILE"
    PREVIOUS_STATE="$STATE"
    
    sleep "$CHECK_INTERVAL"
done
