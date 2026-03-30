#!/usr/bin/env bash
# Database monitoring script - runs inside backend container
# Checks user count every minute and logs when the database appears unhealthy

# NOTE: No set -e because we want to handle errors gracefully
set -o pipefail

# Configuration
CHECK_INTERVAL=${DB_MONITOR_INTERVAL:-60}
LOG_FILE="/var/www/storage/logs/db-monitor.log"
STATE_FILE="/var/www/storage/logs/db-monitor-state.txt"
APP_URL_VALUE=${APP_URL:-http://localhost:8000}

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

get_db_stats() {
    local result
    result=$(php artisan tinker --execute="
        \$users = DB::table('users')->count();
        \$pets = DB::table('pets')->count();
        \$roles = DB::table('roles')->count();
        echo json_encode(['users' => \$users, 'pets' => \$pets, 'roles' => \$roles]);
    " 2>&1)
    local exit_code=$?
    
    # Debug logging - append directly to file, don't use log_message which outputs to stdout
    echo "$(date '+%Y-%m-%d %H:%M:%S') - DEBUG: tinker exit_code=$exit_code, output=$result" >> "$LOG_FILE"
    
    if [ $exit_code -ne 0 ]; then
        echo '{"users":null,"pets":null,"roles":null,"error":"query_failed"}'
    else
        echo "$result"
    fi
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
        
        # Record transition if state changed to error
        if [ "$PREVIOUS_STATE" != "error" ]; then
            log_message "Database state changed to error at ${TIMESTAMP} (app: ${APP_URL_VALUE}, previous: ${PREVIOUS_STATE}, host: $(hostname))"
        fi
    elif [ "$USER_COUNT" = "0" ] && [ "$ROLE_COUNT" = "0" ]; then
        log_message "ALERT: Database is EMPTY - users=$USER_COUNT, pets=$PET_COUNT, roles=$ROLE_COUNT"
        STATE="empty"
        
        # Record transition if state changed from healthy to empty
        if [ "$PREVIOUS_STATE" != "empty" ]; then
            log_message "Database state changed to empty at ${TIMESTAMP} (app: ${APP_URL_VALUE}, previous: ${PREVIOUS_STATE})"
            
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
        
        if [ "$PREVIOUS_STATE" = "empty" ]; then
            log_message "Database state changed to healthy at ${TIMESTAMP} (app: ${APP_URL_VALUE}, previous: ${PREVIOUS_STATE}, users=${USER_COUNT}, pets=${PET_COUNT}, roles=${ROLE_COUNT})"
        fi
    fi
    
    # Update state
    echo "$STATE" > "$STATE_FILE"
    PREVIOUS_STATE="$STATE"
    
    sleep "$CHECK_INTERVAL"
done
