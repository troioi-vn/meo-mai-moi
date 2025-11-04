#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

print_help() {
    cat <<'EOF'
Usage: ./utils/backup.sh [--list] [--restore BACKUP_FILE] [--clean]

Database backup and restoration utility.

Options:
    --list              List all available backups
    --restore FILE      Restore from specific backup file
    --clean             Remove backups older than BACKUP_RETENTION_DAYS (default: 30)
    -h, --help          Show this help message

Default behavior (no options):
    Create a new database backup with timestamp

Environment Variables:
    BACKUP_RETENTION_DAYS    Number of days to keep backups (default: 30)
    DB_USERNAME              Database username (from .env.docker if not set)
    DB_DATABASE              Database name (from .env.docker if not set)

Examples:
    ./utils/backup.sh                                    # Create new backup
    ./utils/backup.sh --list                             # List backups
    ./utils/backup.sh --restore backups/backup-*.sql.gz  # Restore from backup
    ./utils/backup.sh --clean                            # Remove old backups
    BACKUP_RETENTION_DAYS=7 ./utils/backup.sh --clean    # Keep only 7 days

Backup Location:
    Backups are stored in: $BACKUP_DIR/
    Format: backup-YYYY-MM-DD_HH-MM-SS.sql.gz

IMPORTANT: 
    - Backups are compressed with gzip
    - Restoration will DROP existing data
    - Always verify backups before relying on them
EOF
}

load_db_config() {
    if [ -f "$ENV_FILE" ]; then
        DB_USERNAME=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "user")
        DB_DATABASE=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "meo_mai_moi")
    else
        DB_USERNAME="${DB_USERNAME:-user}"
        DB_DATABASE="${DB_DATABASE:-meo_mai_moi}"
    fi
}

create_backup() {
    mkdir -p "$BACKUP_DIR"
    
    local timestamp
    timestamp=$(date +%Y-%m-%d_%H-%M-%S)
    local backup_file="$BACKUP_DIR/backup-$timestamp.sql.gz"
    
    echo "=========================================="
    echo "Creating Database Backup"
    echo "=========================================="
    echo ""
    echo "Database: $DB_DATABASE"
    echo "User:     $DB_USERNAME"
    echo "Target:   $backup_file"
    echo ""
    
    # Check if db container is running
    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        echo "✗ Database container is not running" >&2
        echo "  Start it with: docker compose up -d db" >&2
        exit 1
    fi
    
    # Create backup
    echo "Creating backup..."
    if docker compose exec -T db pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" --clean --if-exists | gzip > "$backup_file"; then
        local size
        size=$(du -h "$backup_file" | cut -f1)
        echo ""
        echo "✓ Backup created successfully"
        echo "  File: $backup_file"
        echo "  Size: $size"
        
        # Calculate checksum
        local checksum
        checksum=$(sha256sum "$backup_file" | cut -d ' ' -f1)
        echo "  SHA256: $checksum"
        echo "$checksum" > "$backup_file.sha256"
        
        echo ""
        echo "To restore this backup:"
        echo "  ./utils/backup.sh --restore $backup_file"
    else
        echo ""
        echo "✗ Backup failed" >&2
        rm -f "$backup_file"
        exit 1
    fi
}

list_backups() {
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo "No backups found in $BACKUP_DIR"
        return
    fi
    
    echo "=========================================="
    echo "Available Backups"
    echo "=========================================="
    echo ""
    
    local backup_files
    backup_files=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f 2>/dev/null | sort -r)
    
    if [ -z "$backup_files" ]; then
        echo "No backup files found"
        return
    fi
    
    while IFS= read -r backup_file; do
        local filename
        filename=$(basename "$backup_file")
        local size
        size=$(du -h "$backup_file" | cut -f1)
        local mtime
        mtime=$(stat -c %y "$backup_file" | cut -d '.' -f1)
        
        echo "File:     $filename"
        echo "Size:     $size"
        echo "Created:  $mtime"
        
        # Show checksum if available
        if [ -f "$backup_file.sha256" ]; then
            local checksum
            checksum=$(cat "$backup_file.sha256")
            echo "SHA256:   $checksum"
        fi
        
        echo ""
    done <<< "$backup_files"
    
    echo "Total backups: $(echo "$backup_files" | wc -l)"
}

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo "✗ Backup file not found: $backup_file" >&2
        exit 1
    fi
    
    echo "=========================================="
    echo "Restoring Database Backup"
    echo "=========================================="
    echo ""
    echo "Source:   $backup_file"
    echo "Database: $DB_DATABASE"
    echo "User:     $DB_USERNAME"
    echo ""
    
    # Verify checksum if available
    if [ -f "$backup_file.sha256" ]; then
        echo "Verifying backup integrity..."
        local expected_checksum
        expected_checksum=$(cat "$backup_file.sha256")
        local actual_checksum
        actual_checksum=$(sha256sum "$backup_file" | cut -d ' ' -f1)
        
        if [ "$expected_checksum" = "$actual_checksum" ]; then
            echo "✓ Checksum verified"
        else
            echo "✗ Checksum mismatch!" >&2
            echo "  Expected: $expected_checksum" >&2
            echo "  Actual:   $actual_checksum" >&2
            read -r -p "Continue anyway? (yes/no): " continue_restore
            if [ "$continue_restore" != "yes" ]; then
                echo "❌ Restoration cancelled"
                exit 1
            fi
        fi
        echo ""
    fi
    
    # Confirm restoration
    echo "⚠️  WARNING: This will DROP and replace all existing data!"
    read -r -p "Type 'yes' to confirm restoration: " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit 1
    fi
    
    # Check if db container is running
    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        echo "✗ Database container is not running" >&2
        echo "  Start it with: docker compose up -d db" >&2
        exit 1
    fi
    
    echo ""
    echo "Restoring backup..."
    
    if gunzip -c "$backup_file" | docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_DATABASE" >/dev/null 2>&1; then
        echo ""
        echo "✓ Backup restored successfully"
        echo ""
        echo "Next steps:"
        echo "  1. Verify data: docker compose exec backend php artisan tinker"
        echo "  2. Clear caches: docker compose exec backend php artisan optimize:clear"
    else
        echo ""
        echo "✗ Restoration failed" >&2
        echo "Check database logs for details" >&2
        exit 1
    fi
}

clean_old_backups() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return
    fi
    
    echo "=========================================="
    echo "Cleaning Old Backups"
    echo "=========================================="
    echo ""
    echo "Retention period: $RETENTION_DAYS days"
    echo ""
    
    local count=0
    local total_size=0
    
    while IFS= read -r backup_file; do
        if [ -n "$backup_file" ]; then
            local filename
            filename=$(basename "$backup_file")
            local size
            size=$(stat -c %s "$backup_file")
            total_size=$((total_size + size))
            
            echo "Removing: $filename"
            rm -f "$backup_file" "$backup_file.sha256"
            count=$((count + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)
    
    if [ "$count" -eq 0 ]; then
        echo "No old backups to remove"
    else
        local human_size
        human_size=$(numfmt --to=iec-i --suffix=B "$total_size" 2>/dev/null || echo "$total_size bytes")
        echo ""
        echo "✓ Removed $count backup(s)"
        echo "  Space freed: $human_size"
    fi
}

# --- Main Script ---

load_db_config

ACTION="${1:-create}"

case "$ACTION" in
    --list)
        list_backups
        ;;
    --restore)
        if [ -z "${2:-}" ]; then
            echo "✗ Backup file not specified" >&2
            echo "Usage: $0 --restore BACKUP_FILE" >&2
            exit 1
        fi
        restore_backup "$2"
        ;;
    --clean)
        clean_old_backups
        ;;
    -h|--help)
        print_help
        ;;
    create|"")
        create_backup
        ;;
    *)
        echo "✗ Unknown option: $ACTION" >&2
        print_help
        exit 1
        ;;
esac
