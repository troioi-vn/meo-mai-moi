#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    local level="$1"
    local message="$2"
    local color="$NC"
    case "$level" in
        ERROR) color="$RED" ;;
        WARN) color="$YELLOW" ;;
        INFO) color="$BLUE" ;;
        SUCCESS) color="$GREEN" ;;
    esac
    echo -e "${color}[$level]${NC} $message"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -eq 0 ]; then
        log "INFO" "Running with root privileges"
        CRON_USER="root"
    else
        log "INFO" "Running as user: $(whoami)"
        CRON_USER="$(whoami)"
    fi
}

# Check if cron is available
check_cron() {
    if ! command -v crontab >/dev/null 2>&1; then
        log "ERROR" "crontab command not found. Please install cron first."
        echo "  Ubuntu/Debian: sudo apt install cron"
        echo "  CentOS/RHEL: sudo yum install cronie"
        echo "  macOS: cron is built-in"
        exit 1
    fi

    # Check if cron service is running
    if command -v systemctl >/dev/null 2>&1; then
        if ! systemctl is-active --quiet cron 2>/dev/null && ! systemctl is-active --quiet crond 2>/dev/null; then
            log "WARN" "Cron service may not be running. You may need to start it:"
            echo "  sudo systemctl start cron  # or crond on some systems"
            echo "  sudo systemctl enable cron"
        fi
    fi

    log "SUCCESS" "Cron is available"
}

# Show current cron jobs
show_current_cron() {
    echo ""
    echo "Current cron jobs for user $CRON_USER:"
    echo "----------------------------------------"
    crontab -l 2>/dev/null || echo "(no cron jobs)"
    echo ""
}

# Add backup cron job
add_backup_cron() {
    local schedule="$1"
    local backup_type="${2:-all}"

    # Determine cron schedule
    case "$schedule" in
        hourly)
            cron_schedule="0 * * * *"
            ;;
        daily)
            cron_schedule="0 2 * * *"
            ;;
        weekly)
            cron_schedule="0 2 * * 1"
            ;;
        monthly)
            cron_schedule="0 2 1 * *"
            ;;
        *)
            log "ERROR" "Invalid schedule: $schedule"
            echo "Valid schedules: hourly, daily, weekly, monthly"
            exit 1
            ;;
    esac

    local backup_script="$SCRIPT_DIR/backup-scheduler.sh"
    local cron_command="$cron_schedule BACKUP_SCHEDULE=$schedule BACKUP_TYPE=$backup_type $backup_script"

    log "INFO" "Adding cron job: $cron_command"

    # Check if job already exists
    if crontab -l 2>/dev/null | grep -q "backup-scheduler.sh"; then
        log "WARN" "Backup cron job already exists. Remove it first with: crontab -e"
        return 1
    fi

    # Add the cron job
    (
        crontab -l 2>/dev/null || true
        echo "# Meo Mai Moi automated backup ($schedule $backup_type)"
        echo "$cron_command"
    ) | crontab -

    log "SUCCESS" "Backup cron job added successfully"
    echo ""
    echo "Cron job details:"
    echo "  Schedule: $schedule ($cron_schedule)"
    echo "  Type: $backup_type"
    echo "  Script: $backup_script"
    echo ""
    echo "To edit/remove: crontab -e"
    echo "To list jobs: crontab -l"
}

# Remove backup cron job
remove_backup_cron() {
    log "INFO" "Removing backup cron jobs..."

    if crontab -l 2>/dev/null | grep -q "backup-scheduler.sh"; then
        crontab -l 2>/dev/null | grep -v "backup-scheduler.sh" | crontab -
        log "SUCCESS" "Backup cron job removed"
    else
        log "INFO" "No backup cron job found"
    fi
}

# Show menu
show_menu() {
    echo ""
    echo "Meo Mai Moi Backup Cron Setup"
    echo "============================="
    echo ""
    echo "Current user: $CRON_USER"
    echo ""
    echo "Options:"
    echo "  1) Add daily backup cron job"
    echo "  2) Add weekly backup cron job"
    echo "  3) Add custom backup cron job"
    echo "  4) Remove backup cron job"
    echo "  5) Show current cron jobs"
    echo "  6) Test backup scheduler"
    echo "  7) Exit"
    echo ""
}

# Interactive setup
interactive_setup() {
    while true; do
        show_menu
        read -r -p "Choose an option (1-7): " choice
        echo ""

        case "$choice" in
            1)
                add_backup_cron "daily" "all"
                ;;
            2)
                add_backup_cron "weekly" "all"
                ;;
            3)
                echo "Available schedules:"
                echo "  hourly  - Every hour"
                echo "  daily   - Every day at 2 AM"
                echo "  weekly  - Every Monday at 2 AM"
                echo "  monthly - First day of month at 2 AM"
                echo ""
                read -r -p "Choose schedule: " schedule
                read -r -p "Backup type (all/database/uploads) [all]: " backup_type
                backup_type="${backup_type:-all}"
                add_backup_cron "$schedule" "$backup_type"
                ;;
            4)
                remove_backup_cron
                ;;
            5)
                show_current_cron
                ;;
            6)
                log "INFO" "Testing backup scheduler..."
                if "$SCRIPT_DIR/backup-scheduler.sh" --dry-run; then
                    log "SUCCESS" "Backup scheduler test completed"
                else
                    log "ERROR" "Backup scheduler test failed"
                fi
                ;;
            7)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                log "ERROR" "Invalid option: $choice"
                ;;
        esac

        echo ""
        read -r -p "Press Enter to continue..."
    done
}

# Main execution
main() {
    check_permissions
    check_cron

    case "${1:-}" in
        --add-daily)
            add_backup_cron "daily" "${2:-all}"
            ;;
        --add-weekly)
            add_backup_cron "weekly" "${2:-all}"
            ;;
        --remove)
            remove_backup_cron
            ;;
        --list)
            show_current_cron
            ;;
        --help|-h)
            cat << EOF
Usage: $0 [OPTIONS]

Setup automated backup cron jobs for Meo Mai Moi.

Options:
    --add-daily [TYPE]    Add daily backup cron job (type: all/database/uploads)
    --add-weekly [TYPE]   Add weekly backup cron job (type: all/database/uploads)
    --remove              Remove all backup cron jobs
    --list                Show current cron jobs
    --interactive         Interactive setup menu
    --help, -h            Show this help

Examples:
    $0 --add-daily              # Add daily backup for all data
    $0 --add-daily database     # Add daily database-only backup
    $0 --add-weekly uploads     # Add weekly uploads-only backup
    $0 --remove                 # Remove backup cron jobs
    $0 --interactive            # Interactive setup

Cron Schedules:
    Daily:   0 2 * * * (2 AM every day)
    Weekly:  0 2 * * 1 (2 AM every Monday)
    Monthly: 0 2 1 * * (2 AM first day of month)

Note: Requires cron to be installed and running on the system.
EOF
            exit 0
            ;;
        --interactive|"")
            interactive_setup
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Use $0 --help for usage information" >&2
            exit 1
            ;;
    esac
}

main "$@"