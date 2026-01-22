#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment if available
if [ -f "$PROJECT_ROOT/.env" ]; then
    # shellcheck source=/dev/null
    source "$PROJECT_ROOT/.env"
fi

# Default configuration
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-daily}"  # daily, weekly, monthly
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_MAX_AGE="${BACKUP_MAX_AGE:-7}"  # Maximum age in days for scheduled backups
BACKUP_TYPE="${BACKUP_TYPE:-all}"  # all, database, uploads
BACKUP_NOTIFICATION="${BACKUP_NOTIFICATION:-false}"  # Enable Telegram notifications
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/.deploy/backup-scheduler.log}"

# CLI overrides
FORCE_RUN="false"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    echo "[$timestamp] [$level] $message"
}

# Send notification if enabled
notify() {
    local message="$1"
    if [ "$BACKUP_NOTIFICATION" = "true" ] && [ -f "$SCRIPT_DIR/telegram_notify.sh" ]; then
        # shellcheck source=./telegram_notify.sh
        source "$SCRIPT_DIR/telegram_notify.sh"
        telegram_send "$message" 2>/dev/null || log "WARN" "Failed to send notification: $message"
    fi
}

# Check if we should run backup based on schedule
should_run_backup() {
    local last_backup_file="$PROJECT_ROOT/.deploy/last-scheduled-backup"
    local current_time
    current_time=$(date +%s)

    if [ ! -f "$last_backup_file" ]; then
        log "INFO" "No previous scheduled backup found, running backup"
        return 0
    fi

    local last_backup_time
    last_backup_time=$(cat "$last_backup_file" 2>/dev/null || echo "0")
    local time_diff=$((current_time - last_backup_time))

    case "$BACKUP_SCHEDULE" in
        hourly)
            local threshold=$((60 * 60))  # 1 hour
            ;;
        daily)
            local threshold=$((24 * 60 * 60))  # 24 hours
            ;;
        weekly)
            local threshold=$((7 * 24 * 60 * 60))  # 7 days
            ;;
        monthly)
            local threshold=$((30 * 24 * 60 * 60))  # 30 days
            ;;
        *)
            log "ERROR" "Invalid BACKUP_SCHEDULE: $BACKUP_SCHEDULE"
            return 1
            ;;
    esac

    if [ "$time_diff" -ge "$threshold" ]; then
        log "INFO" "Time since last backup (${time_diff}s) exceeds threshold (${threshold}s), running backup"
        return 0
    else
        log "INFO" "Skipping backup - last backup was ${time_diff}s ago, threshold is ${threshold}s"
        return 1
    fi
}

# Check system health before backup
check_system_health() {
    log "INFO" "Checking system health..."

    # Check if docker is running
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not running"
        notify "❌ Scheduled backup failed: Docker is not running"
        exit 1
    fi

    # Check if containers are running
    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        log "ERROR" "Database container is not running"
        notify "❌ Scheduled backup failed: Database container not running"
        exit 1
    fi

    if ! docker compose ps --status=running 2>/dev/null | grep -q " backend "; then
        log "ERROR" "Backend container is not running"
        notify "❌ Scheduled backup failed: Backend container not running"
        exit 1
    fi

    # Check database connectivity
    if ! docker compose exec -T db psql -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-meo_mai_moi}" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to database"
        notify "❌ Scheduled backup failed: Database connectivity issue"
        exit 1
    fi

    # Check disk space
    local available_space
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4 * 1024}') # Available space in bytes
    local min_space=$((100 * 1024 * 1024)) # 100MB minimum

    if [ "$available_space" -lt "$min_space" ]; then
        local available_human
        available_human=$(numfmt --to=iec-i --suffix=B "$available_space" 2>/dev/null || echo "${available_space}B")
        log "ERROR" "Insufficient disk space: ${available_human} available, need at least 100MB"
        notify "❌ Scheduled backup failed: Insufficient disk space (${available_human})"
        exit 1
    fi

    log "INFO" "System health check passed"
}

# Run backup and cleanup
run_backup() {
    log "INFO" "Starting scheduled backup (type: $BACKUP_TYPE, schedule: $BACKUP_SCHEDULE)"

    # Run the backup
    if "$SCRIPT_DIR/backup.sh" "$BACKUP_TYPE" >> "$LOG_FILE" 2>&1; then
        log "INFO" "Backup completed successfully"

        # Update last backup timestamp
        date +%s > "$PROJECT_ROOT/.deploy/last-scheduled-backup"

        # Send success notification
        notify "✅ Scheduled backup completed successfully"

        # Run cleanup
        log "INFO" "Running backup cleanup (retention: ${BACKUP_RETENTION_DAYS} days)"
        if "$SCRIPT_DIR/backup.sh" --clean >> "$LOG_FILE" 2>&1; then
            log "INFO" "Cleanup completed successfully"
        else
            log "WARN" "Cleanup failed, but backup was successful"
        fi

    else
        log "ERROR" "Backup failed"
        notify "❌ Scheduled backup failed - check logs at $LOG_FILE"
        exit 1
    fi
}

# Main execution
main() {
    log "INFO" "=== Backup Scheduler Started ==="
    log "INFO" "Schedule: $BACKUP_SCHEDULE, Type: $BACKUP_TYPE, Retention: ${BACKUP_RETENTION_DAYS} days"

    # Check if we should run backup
    if [ "$FORCE_RUN" != "true" ]; then
        if ! should_run_backup; then
            log "INFO" "Backup not needed at this time"
            exit 0
        fi
    else
        log "INFO" "Bypassing schedule checks (forced run)"
    fi

    # Check system health
    check_system_health

    # Run backup
    run_backup

    log "INFO" "=== Backup Scheduler Completed ==="
}

# Show help
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Automated backup scheduler for Meo Mai Moi.

Options:
    -h, --help          Show this help message
    --run-now           Run backup immediately (ignore schedule)
    --force             Force backup even if schedule doesn't require it
    --dry-run           Show what would be done without actually running backup

Environment Variables:
    BACKUP_SCHEDULE     Backup frequency: hourly, daily, weekly, monthly (default: daily)
    BACKUP_RETENTION_DAYS  Days to keep backups (default: 30)
    BACKUP_MAX_AGE      Maximum age in days for backups (default: 7)
    BACKUP_TYPE         Type of backup: all, database, uploads (default: all)
    BACKUP_NOTIFICATION Enable Telegram notifications (default: false)
    LOG_FILE            Log file path (default: .deploy/backup-scheduler.log)

Examples:
    # Run scheduled backup (respect schedule)
    $0

    # Force immediate backup
    $0 --run-now

    # Daily database-only backups
    BACKUP_SCHEDULE=daily BACKUP_TYPE=database $0

    # Enable notifications for production
    BACKUP_NOTIFICATION=true $0

Setup cron job for daily backups at 2 AM:
    0 2 * * * /path/to/meo-mai-moi/utils/backup-scheduler.sh

Setup cron job for hourly backups:
    0 * * * * BACKUP_SCHEDULE=hourly /path/to/meo-mai-moi/utils/backup-scheduler.sh
EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --run-now)
        log "INFO" "Forced immediate backup (--run-now)"
        FORCE_RUN="true"
        ;;
    --force)
        log "INFO" "Forced backup (--force)"
        rm -f "$PROJECT_ROOT/.deploy/last-scheduled-backup"
        FORCE_RUN="true"
        ;;
    --dry-run)
        log "INFO" "Dry run mode - would run backup with settings:"
        log "INFO" "  Schedule: $BACKUP_SCHEDULE"
        log "INFO" "  Type: $BACKUP_TYPE"
        log "INFO" "  Retention: ${BACKUP_RETENTION_DAYS} days"
        log "INFO" "  Notifications: $BACKUP_NOTIFICATION"
        exit 0
        ;;
    "")
        # Normal execution
        ;;
    *)
        echo "Unknown option: $1" >&2
        echo "Use $0 --help for usage information" >&2
        exit 1
        ;;
esac

main "$@"