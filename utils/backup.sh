#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
EXIT_CODE_CANCELLED=2

print_help() {
    cat <<'EOF'
Usage: ./utils/backup.sh [OPTIONS] [TYPE]

Backup and restoration utility for database and uploads.

Options:
    --list                      List all available backups
    --restore-database FILE     Restore database from specific backup file
    --restore-uploads FILE      Restore uploads from specific backup file
    --restore-all TIMESTAMP     Restore both database and uploads from timestamp
    --clean                     Remove backups older than BACKUP_RETENTION_DAYS (default: 30)
    -h, --help                  Show this help message

Backup Types (default: all):
    all                         Create both database and uploads backups
    database                    Create only database backup
    uploads                     Create only uploads backup

Default behavior (no options):
    Create both database and uploads backups with timestamp

Environment Variables:
    BACKUP_RETENTION_DAYS       Number of days to keep backups (default: 30)
    DB_USERNAME                 Database username (from backend/.env if not set)
    DB_DATABASE                 Database name (from backend/.env if not set)

Examples:
    ./utils/backup.sh                                    # Create database + uploads backup
    ./utils/backup.sh database                           # Create only database backup
    ./utils/backup.sh uploads                            # Create only uploads backup
    ./utils/backup.sh --list                             # List all backups
    ./utils/backup.sh --restore-database backups/backup-*.sql.gz
    ./utils/backup.sh --restore-uploads backups/uploads_backup-*.tar.gz
    ./utils/backup.sh --restore-all 2024-01-22_14-51-10  # Restore both by timestamp
    ./utils/backup.sh --clean                            # Remove backups older than 30 days

Backup Locations:
    Database backups:  $BACKUP_DIR/backup-YYYY-MM-DD_HH-MM-SS.sql.gz
    Uploads backups:   $BACKUP_DIR/uploads_backup-YYYY-MM-DD_HH-MM-SS.tar.gz
    Checksums:         *.sha256 files for integrity verification

IMPORTANT:
    - Database backups are compressed with gzip
    - Uploads backups are compressed tar.gz archives
    - Restoration will REPLACE existing data
    - Always verify backups before relying on them
    - Use --restore-all for coordinated database + uploads restoration
EOF
}

load_db_config() {
    if [ -f "$ENV_FILE" ]; then
        DB_USERNAME=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' || echo "user")
        DB_DATABASE=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' || echo "meo_mai_moi")
    else
        DB_USERNAME="${DB_USERNAME:-user}"
        DB_DATABASE="${DB_DATABASE:-meo_mai_moi}"
    fi
    # Docker volume name is based on project directory name
    DOCKER_VOLUME_NAME="$(basename "$PROJECT_ROOT")_uploads_data"
}

resolve_backup_path() {
    local input_path="$1"
    if [ -f "$input_path" ]; then
        printf '%s' "$input_path"
        return 0
    fi

    # Allow running the script from anywhere by resolving relative paths against PROJECT_ROOT.
    if [[ "$input_path" != /* ]] && [ -f "$PROJECT_ROOT/$input_path" ]; then
        printf '%s' "$PROJECT_ROOT/$input_path"
        return 0
    fi

    printf '%s' "$input_path"
}

# Validate backup file integrity
validate_backup_file() {
    local file
    file=$(resolve_backup_path "$1")
    local expected_type="$2"

    if [ ! -f "$file" ]; then
        echo "✗ Backup file not found: $1" >&2
        if [[ "$1" != /* ]]; then
            echo "  Also checked: $PROJECT_ROOT/$1" >&2
        fi
        return 1
    fi

    # Check file size
    local size
    size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    if [ "$size" -eq 0 ]; then
        echo "✗ Backup file is empty: $file" >&2
        return 1
    fi

    # Validate file type based on extension
    case "$expected_type" in
        database)
            if [[ ! "$file" == *.sql.gz ]]; then
                echo "✗ Invalid database backup file extension (expected .sql.gz): $file" >&2
                return 1
            fi
            ;;
        uploads)
            if [[ ! "$file" == *.tar.gz ]]; then
                echo "✗ Invalid uploads backup file extension (expected .tar.gz): $file" >&2
                return 1
            fi
            ;;
    esac

    # Check if file is readable
    if [ ! -r "$file" ]; then
        echo "✗ Backup file is not readable: $file" >&2
        return 1
    fi

    return 0
}

# Check system resources before operations
check_system_resources() {
    local operation="$1"

    # Check available disk space (require at least 100MB free)
    local available_space
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4 * 1024}' 2>/dev/null || echo "0")

    if [ "$available_space" -lt $((100 * 1024 * 1024)) ]; then
        local available_human
        available_human=$(numfmt --to=iec-i --suffix=B "$available_space" 2>/dev/null || echo "${available_space}B")
        echo "✗ Insufficient disk space: ${available_human} available (need at least 100MB)" >&2
        return 1
    fi

    # Check if we're running operations that might be resource intensive
    case "$operation" in
        backup)
            # Check if another backup is already running
            # if pgrep -f "backup.sh" | grep -v $$ >/dev/null 2>&1; then
            #     echo "⚠️  Another backup operation appears to be running" >&2
            #     return 1
            # fi
            ;;
        restore)
            # For restore operations, be more cautious
            if [ "$(docker compose ps -q | wc -l)" -lt 2 ]; then
                echo "⚠️  Not all containers are running - this may affect restore operations" >&2
            fi
            ;;
    esac

    return 0
}

create_backup() {
    local backup_type="${1:-all}"

    # Validate backup type
    case "$backup_type" in
        all|database|uploads) ;;
        *)
            echo "✗ Invalid backup type: $backup_type" >&2
            echo "  Valid types: all, database, uploads" >&2
            exit 1
            ;;
    esac

    # Check system resources
    if ! check_system_resources "backup"; then
        exit 1
    fi

    mkdir -p "$BACKUP_DIR"

    local timestamp
    timestamp=$(date +%Y-%m-%d_%H-%M-%S)

    echo "=========================================="
    echo "Creating Backup ($backup_type)"
    echo "=========================================="
    echo ""
    echo "Timestamp: $timestamp"
    echo "Type:      $backup_type"
    echo ""

    local success_count=0
    local total_count=0

    # Database backup
    if [ "$backup_type" = "all" ] || [ "$backup_type" = "database" ]; then
        total_count=$((total_count + 1))
        local db_backup_file="$BACKUP_DIR/backup-$timestamp.sql.gz"

        echo "Database: $DB_DATABASE"
        echo "User:     $DB_USERNAME"
        echo "Target:   $db_backup_file"
        echo ""

        # Check if db container is running
        if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
            echo "✗ Database container is not running" >&2
            echo "  Start it with: docker compose up -d db" >&2
            exit 1
        fi

        # Create database backup
        echo "Creating database backup..."
        CURRENT_BACKUP_FILE="$db_backup_file"
        if docker compose exec -T db pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" --clean --if-exists | gzip > "$db_backup_file"; then
            # Validate the backup file was created and has content
            if [ ! -s "$db_backup_file" ]; then
                echo "✗ Database backup file is empty or was not created properly" >&2
                rm -f "$db_backup_file"
                exit 1
            fi

            local size
            size=$(du -h "$db_backup_file" | cut -f1)
            echo ""
            echo "✓ Database backup created successfully"
            echo "  File: $db_backup_file"
            echo "  Size: $size"

            # Calculate and store checksum
            local checksum
            checksum=$(sha256sum "$db_backup_file" | cut -d ' ' -f1)
            echo "  SHA256: $checksum"
            echo "$checksum" > "$db_backup_file.sha256"

            # Verify checksum was written
            if [ ! -f "$db_backup_file.sha256" ]; then
                echo "⚠️  Warning: Could not create checksum file" >&2
            fi

            success_count=$((success_count + 1))
            unset CURRENT_BACKUP_FILE
        else
            echo ""
            echo "✗ Database backup failed" >&2
            rm -f "$db_backup_file"
            exit 1
        fi
        echo ""
    fi

    # Uploads backup
    if [ "$backup_type" = "all" ] || [ "$backup_type" = "uploads" ]; then
        total_count=$((total_count + 1))
        local uploads_backup_file="$BACKUP_DIR/uploads_backup-$timestamp.tar.gz"

        echo "Creating uploads backup..."
        echo "Source volume: uploads_data"
        echo "Target:        $uploads_backup_file"
        echo ""

        # Check if backend container is running (for volume access)
        if ! docker compose ps --status=running 2>/dev/null | grep -q " backend "; then
            echo "✗ Backend container is not running" >&2
            echo "  Start it with: docker compose up -d backend" >&2
            exit 1
        fi

        # Create uploads backup using alpine container to access the volume
        CURRENT_BACKUP_FILE="$uploads_backup_file"
        if docker run --rm -v "$DOCKER_VOLUME_NAME:/volume" -v "$BACKUP_DIR:/backup" alpine sh -c "
            cd /volume && \
            if [ \"\$(find . -mindepth 1 | wc -l)\" -gt 0 ]; then \
                tar -czf \"/backup/$(basename "$uploads_backup_file")\" . && \
                echo 'SUCCESS'; \
            else \
                echo 'EMPTY'; \
            fi" | grep -q "SUCCESS"; then

            # Validate the backup file was created and has content
            if [ ! -s "$uploads_backup_file" ]; then
                echo "✗ Uploads backup file is empty or was not created properly" >&2
                rm -f "$uploads_backup_file"
                exit 1
            fi

            local size
            size=$(du -h "$uploads_backup_file" | cut -f1)
            echo "✓ Uploads backup created successfully"
            echo "  File: $uploads_backup_file"
            echo "  Size: $size"

            # Calculate and store checksum
            local checksum
            checksum=$(sha256sum "$uploads_backup_file" | cut -d ' ' -f1)
            echo "  SHA256: $checksum"
            echo "$checksum" > "$uploads_backup_file.sha256"

            # Verify checksum was written
            if [ ! -f "$uploads_backup_file.sha256" ]; then
                echo "⚠️  Warning: Could not create checksum file" >&2
            fi

            success_count=$((success_count + 1))
            unset CURRENT_BACKUP_FILE
        elif docker run --rm -v "$DOCKER_VOLUME_NAME:/volume" -v "$BACKUP_DIR:/backup" alpine sh -c "
            cd /volume && \
            find . -mindepth 1 | wc -l" | grep -q "^0$"; then
            echo "ℹ️  Uploads directory is empty - skipping backup"
            echo "  (No uploads_backup file created)"
            success_count=$((success_count + 1))
        else
            echo ""
            echo "✗ Uploads backup failed" >&2
            rm -f "$uploads_backup_file"
            exit 1
        fi
        echo ""
    fi

    echo "=========================================="
    echo "Backup Summary"
    echo "=========================================="
    echo "Type:     $backup_type"
    echo "Success:  $success_count / $total_count"
    echo "Timestamp: $timestamp"

    if [ "$success_count" -eq "$total_count" ]; then
        echo ""
        echo "✓ All backups completed successfully"
        if [ "$backup_type" = "all" ]; then
            echo ""
            echo "To restore these backups:"
            echo "  ./utils/backup.sh --restore-database backups/backup-$timestamp.sql.gz"
            echo "  ./utils/backup.sh --restore-uploads backups/uploads_backup-$timestamp.tar.gz"
            echo "  # Or restore both:"
            echo "  ./utils/backup.sh --restore-all $timestamp"
        fi
    else
        echo ""
        echo "✗ Some backups failed ($((total_count - success_count)) failed)" >&2
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

    # Collect all backup files with timestamps
    local all_files
    all_files=$(find "$BACKUP_DIR" \( -name "backup-*.sql.gz" -o -name "uploads_backup-*.tar.gz" \) -type f 2>/dev/null | sort -r)

    if [ -z "$all_files" ]; then
        echo "No backup files found"
        return
    fi

    local db_count=0
    local uploads_count=0
    local total_size=0

    while IFS= read -r backup_file; do
        local filename
        filename=$(basename "$backup_file")
        local size_bytes
        size_bytes=$(stat -c%s "$backup_file")
        total_size=$((total_size + size_bytes))
        local size_human
        size_human=$(du -h "$backup_file" | cut -f1)
        local mtime
        mtime=$(stat -c %y "$backup_file" | cut -d '.' -f1)

        # Extract timestamp from filename
        local timestamp=""
        if [[ "$filename" =~ backup-(.+)\.sql\.gz ]]; then
            timestamp="${BASH_REMATCH[1]}"
            db_count=$((db_count + 1))
        elif [[ "$filename" =~ uploads_backup-(.+)\.tar\.gz ]]; then
            timestamp="${BASH_REMATCH[1]}"
            uploads_count=$((uploads_count + 1))
        fi

        echo "File:     $filename"
        echo "Type:     $(if [[ "$filename" == backup-* ]]; then echo "Database"; else echo "Uploads"; fi)"
        echo "Size:     $size_human"
        echo "Created:  $mtime"
        echo "Timestamp: $timestamp"

        # Show checksum if available
        if [ -f "$backup_file.sha256" ]; then
            local checksum
            checksum=$(cat "$backup_file.sha256")
            echo "SHA256:   $checksum"
        fi

        echo ""
    done <<< "$all_files"

    echo "Summary:"
    echo "  Database backups: $db_count"
    echo "  Uploads backups:  $uploads_count"
    echo "  Total size:       $(numfmt --to=iec-i --suffix=B "$total_size" 2>/dev/null || echo "${total_size}B")"
    echo "  Retention:        $RETENTION_DAYS days (auto-cleanup)"
}

restore_database_backup() {
    local backup_file
    backup_file=$(resolve_backup_path "$1")

    # Validate backup file
    if ! validate_backup_file "$backup_file" "database"; then
        exit 1
    fi

    # Check system resources
    if ! check_system_resources "restore"; then
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
            if ! read -r -p "Continue anyway? (yes/no): " continue_restore; then
                echo "❌ Restoration cancelled" 
                exit "$EXIT_CODE_CANCELLED"
            fi
            if [ "$continue_restore" != "yes" ]; then
                echo "❌ Restoration cancelled"
                exit "$EXIT_CODE_CANCELLED"
            fi
        fi
        echo ""
    fi

    # Pre-restoration checks
    echo "Performing pre-restoration checks..."

    # Check if db container is running
    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        echo "✗ Database container is not running" >&2
        echo "  Start it with: docker compose up -d db" >&2
        exit 1
    fi

    # Test database connectivity
    echo "Testing database connectivity..."
    if ! docker compose exec -T db psql -U "$DB_USERNAME" -d postgres -c "SELECT 1;" </dev/null >/dev/null 2>&1; then
        echo "✗ Cannot connect to database" >&2
        echo "  Check database logs: docker compose logs db" >&2
        exit 1
    fi
    echo "✓ Database connection OK"

    # Check available disk space (rough estimate: backup file size * 2 for temp space)
    local backup_size
    backup_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
    local available_space
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4 * 1024}') # Available space in bytes

    if [ "$backup_size" -gt 0 ] && [ "$available_space" -gt 0 ]; then
        local required_space=$((backup_size * 2)) # Rough estimate for decompression space
        if [ "$available_space" -lt "$required_space" ]; then
            echo "⚠️  Warning: Low disk space detected"
            echo "  Available: $(numfmt --to=iec-i --suffix=B "$available_space" 2>/dev/null || echo "${available_space}B")"
            echo "  Required:  $(numfmt --to=iec-i --suffix=B "$required_space" 2>/dev/null || echo "${required_space}B")"
            if ! read -r -p "Continue anyway? (yes/no): " continue_restore; then
                echo "❌ Restoration cancelled due to low disk space"
                exit "$EXIT_CODE_CANCELLED"
            fi
            if [ "$continue_restore" != "yes" ]; then
                echo "❌ Restoration cancelled due to low disk space"
                exit "$EXIT_CODE_CANCELLED"
            fi
        fi
    fi

    # Confirm restoration
    echo ""
    echo "⚠️  WARNING: This will DROP and replace all existing database data!"
    echo "   - Database: $DB_DATABASE"
    echo "   - Source:   $backup_file"
    echo ""
    if ! read -r -p "Type 'yes' to confirm database restoration: " confirmation; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi
    if [ "$confirmation" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi

    echo ""
    echo "Restoring database backup..."

    echo "Preparing database for restore (dropping and recreating public schema)..."
    if ! docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USERNAME" -d "$DB_DATABASE" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$DB_USERNAME\"; GRANT ALL ON SCHEMA public TO public;" </dev/null >/dev/null 2>&1; then
        echo "✗ Failed to reset public schema before restore" >&2
        echo "  This usually indicates permission issues or a connectivity problem." >&2
        exit 1
    fi

    if gunzip -c "$backup_file" | docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_DATABASE" >/dev/null 2>&1; then
        echo ""
        echo "✓ Database backup restored successfully"

        # Post-restoration validation
        echo "Validating restoration..."
        if docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" </dev/null >/dev/null 2>&1; then
            echo "✓ Database connectivity verified"

            # Try to get a basic table count if possible
            local table_count
            table_count=$(docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t </dev/null 2>/dev/null | tr -d ' ' || echo "unknown")
            if [ "$table_count" != "unknown" ]; then
                echo "✓ Found $table_count tables in database"
            fi
        else
            echo "⚠️  Warning: Could not verify database connectivity after restore"
        fi

        echo ""
        echo "Next steps:"
        echo "  1. Verify data: docker compose exec backend php artisan tinker"
        echo "  2. Clear caches: docker compose exec backend php artisan optimize:clear"
        echo "  3. Restart services if needed: docker compose restart backend"
    else
        echo ""
        echo "✗ Database restoration failed" >&2
        echo "Check database logs for details:" >&2
        echo "  docker compose logs db" >&2
        exit 1
    fi
}

restore_uploads_backup() {
    local backup_file
    backup_file=$(resolve_backup_path "$1")

    # Validate backup file
    if ! validate_backup_file "$backup_file" "uploads"; then
        exit 1
    fi

    # Check system resources
    if ! check_system_resources "restore"; then
        exit 1
    fi

    echo "=========================================="
    echo "Restoring Uploads Backup"
    echo "=========================================="
    echo ""
    echo "Source:   $backup_file"
    echo "Volume:   uploads_data"
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
            if ! read -r -p "Continue anyway? (yes/no): " continue_restore; then
                echo "❌ Restoration cancelled"
                exit "$EXIT_CODE_CANCELLED"
            fi
            if [ "$continue_restore" != "yes" ]; then
                echo "❌ Restoration cancelled"
                exit "$EXIT_CODE_CANCELLED"
            fi
        fi
        echo ""
    fi

    # Pre-restoration checks
    echo "Performing pre-restoration checks..."

    # Check if backend container is running (for volume access)
    if ! docker compose ps --status=running 2>/dev/null | grep -q " backend "; then
        echo "✗ Backend container is not running" >&2
        echo "  Start it with: docker compose up -d backend" >&2
        exit 1
    fi

    # Check available disk space (rough estimate: backup file size * 1.5 for extraction space)
    local backup_size
    backup_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
    local available_space
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4 * 1024}') # Available space in bytes

    if [ "$backup_size" -gt 0 ] && [ "$available_space" -gt 0 ]; then
        local required_space=$((backup_size * 3 / 2)) # Rough estimate for extraction space
        if [ "$available_space" -lt "$required_space" ]; then
            echo "⚠️  Warning: Low disk space detected"
            echo "  Available: $(numfmt --to=iec-i --suffix=B "$available_space" 2>/dev/null || echo "${available_space}B")"
            echo "  Required:  $(numfmt --to=iec-i --suffix=B "$required_space" 2>/dev/null || echo "${required_space}B")"
            if ! read -r -p "Continue anyway? (yes/no): " continue_restore; then
                echo "❌ Restoration cancelled due to low disk space"
                exit "$EXIT_CODE_CANCELLED"
            fi
            if [ "$continue_restore" != "yes" ]; then
                echo "❌ Restoration cancelled due to low disk space"
                exit "$EXIT_CODE_CANCELLED"
            fi
        fi
    fi

    # Confirm restoration
    echo ""
    echo "⚠️  WARNING: This will REPLACE all existing uploaded files!"
    echo "   - Volume: uploads_data"
    echo "   - Source: $backup_file"
    echo ""
    if ! read -r -p "Type 'yes' to confirm uploads restoration: " confirmation; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi
    if [ "$confirmation" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi

    echo ""
    echo "Restoring uploads backup..."

    # Clear existing uploads volume first
    echo "Clearing existing uploads..."
    if ! docker run --rm -v "$DOCKER_VOLUME_NAME:/volume" alpine sh -c "rm -rf /volume/*"; then
        echo "⚠️  Warning: Could not clear existing uploads (may not exist yet)"
    fi

    # Restore from backup
    echo "Extracting backup to volume..."

    local backup_dir
    backup_dir=$(cd "$(dirname "$backup_file")" && pwd)
    local backup_base
    backup_base=$(basename "$backup_file")

    if docker run --rm -v "$DOCKER_VOLUME_NAME:/volume" -v "$backup_dir:/backup:ro" alpine sh -c "
        cd /volume && \
        tar -xzf \"/backup/$backup_base\" && \
        echo 'SUCCESS'"; then

        echo ""
        echo "✓ Uploads backup restored successfully"

        # Post-restoration validation
        echo "Validating restoration..."
        local file_count
        file_count=$(docker run --rm -v "$DOCKER_VOLUME_NAME:/volume" alpine sh -c "find /volume -type f | wc -l" 2>/dev/null || echo "unknown")

        if [ "$file_count" != "unknown" ]; then
            echo "✓ Found $file_count files in uploads volume"
        else
            echo "⚠️  Could not verify file count after restore"
        fi

        echo ""
        echo "Next steps:"
        echo "  1. Verify uploads: Check http://localhost:8000/storage/ (if running)"
        echo "  2. Clear caches: docker compose exec backend php artisan optimize:clear"
        echo "  3. Restart services if needed: docker compose restart backend"
    else
        echo ""
        echo "✗ Uploads restoration failed" >&2
        exit 1
    fi
}

restore_all_backups() {
    local timestamp="$1"

    echo "=========================================="
    echo "Restoring All Backups"
    echo "=========================================="
    echo ""
    echo "Timestamp: $timestamp"
    echo ""

    # Find matching backup files
    local db_backup="$BACKUP_DIR/backup-$timestamp.sql.gz"
    local uploads_backup="$BACKUP_DIR/uploads_backup-$timestamp.tar.gz"

    local db_exists=false
    local uploads_exists=false

    if [ -f "$db_backup" ]; then
        db_exists=true
        echo "✓ Database backup found: $db_backup"
    else
        echo "✗ Database backup not found: $db_backup"
    fi

    if [ -f "$uploads_backup" ]; then
        uploads_exists=true
        echo "✓ Uploads backup found: $uploads_backup"
    else
        echo "ℹ️  Uploads backup not found (this is OK if no uploads existed)"
    fi

    if [ "$db_exists" = false ]; then
        echo ""
        echo "✗ Cannot restore: No database backup found for timestamp $timestamp" >&2
        exit 1
    fi

    echo ""
    echo "⚠️  WARNING: This will REPLACE all existing data!"
    if [ "$db_exists" = true ]; then
        echo "   - Database: $DB_DATABASE (from $db_backup)"
    fi
    if [ "$uploads_exists" = true ]; then
        echo "   - Uploads volume: uploads_data (from $uploads_backup)"
    fi
    echo ""
    if ! read -r -p "Type 'yes' to confirm full restoration: " confirmation; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi
    if [ "$confirmation" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit "$EXIT_CODE_CANCELLED"
    fi

    # Restore database first
    if [ "$db_exists" = true ]; then
        echo ""
        restore_database_backup "$db_backup"
    fi

    # Then restore uploads
    if [ "$uploads_exists" = true ]; then
        echo ""
        restore_uploads_backup "$uploads_backup"
    else
        echo ""
        echo "ℹ️  Skipping uploads restoration (no backup found)"
    fi

    echo ""
    echo "=========================================="
    echo "✓ Full restoration completed"
    echo "=========================================="
}

# Legacy function for backward compatibility
restore_backup() {
    restore_database_backup "$1"
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

    # Clean database backups
    local db_files_removed=0
    local db_size_freed=0
    while IFS= read -r backup_file; do
        if [ -n "$backup_file" ]; then
            local filename
            filename=$(basename "$backup_file")
            local size
            size=$(stat -c %s "$backup_file")
            db_size_freed=$((db_size_freed + size))

            echo "Removing database backup: $filename"
            rm -f "$backup_file" "$backup_file.sha256"
            db_files_removed=$((db_files_removed + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)

    # Clean uploads backups
    local uploads_files_removed=0
    local uploads_size_freed=0
    while IFS= read -r backup_file; do
        if [ -n "$backup_file" ]; then
            local filename
            filename=$(basename "$backup_file")
            local size
            size=$(stat -c %s "$backup_file")
            uploads_size_freed=$((uploads_size_freed + size))

            echo "Removing uploads backup: $filename"
            rm -f "$backup_file" "$backup_file.sha256"
            uploads_files_removed=$((uploads_files_removed + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "uploads_backup-*.tar.gz" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)

    count=$((db_files_removed + uploads_files_removed))
    total_size=$((db_size_freed + uploads_size_freed))

    if [ "$count" -eq 0 ]; then
        echo "No old backups to remove"
    else
        local human_size
        human_size=$(numfmt --to=iec-i --suffix=B "$total_size" 2>/dev/null || echo "$total_size bytes")
        echo ""
        echo "✓ Cleanup completed"
        echo "  Database backups removed: $db_files_removed"
        echo "  Uploads backups removed:  $uploads_files_removed"
        echo "  Total space freed:         $human_size"
    fi
}

# --- Main Script ---

# Set up error handling
cleanup_on_error() {
    local exit_code="$?"
    if [ "$exit_code" -eq "$EXIT_CODE_CANCELLED" ]; then
        return 0
    fi
    if [ "$exit_code" -ne 0 ]; then
        echo ""
        echo "✗ Backup operation failed (exit code: $exit_code)" >&2
        # Clean up any partial backup files if they exist
        if [ -n "${CURRENT_BACKUP_FILE:-}" ] && [ -f "${CURRENT_BACKUP_FILE:-}" ]; then
            echo "Cleaning up partial backup file: $CURRENT_BACKUP_FILE" >&2
            rm -f "$CURRENT_BACKUP_FILE" "${CURRENT_BACKUP_FILE}.sha256"
        fi
    fi
}

trap cleanup_on_error EXIT

load_db_config

# Parse arguments
ACTION="create"
BACKUP_TYPE="all"
RESTORE_TARGET=""
TIMESTAMP=""

while [ $# -gt 0 ]; do
    case "$1" in
        --list)
            ACTION="list"
            shift
            ;;
        --restore)
            ACTION="restore_database"
            if [ -n "${2:-}" ] && [[ "$2" != --* ]]; then
                RESTORE_TARGET="$2"
                shift 2
            else
                echo "✗ Backup file not specified" >&2
                echo "Usage: $0 --restore BACKUP_FILE" >&2
                exit 1
            fi
            ;;
        --restore-database)
            ACTION="restore_database"
            if [ -n "${2:-}" ] && [[ "$2" != --* ]]; then
                RESTORE_TARGET="$2"
                shift 2
            else
                echo "✗ Backup file not specified" >&2
                echo "Usage: $0 --restore-database BACKUP_FILE" >&2
                exit 1
            fi
            ;;
        --restore-uploads)
            ACTION="restore_uploads"
            if [ -n "${2:-}" ] && [[ "$2" != --* ]]; then
                RESTORE_TARGET="$2"
                shift 2
            else
                echo "✗ Backup file not specified" >&2
                echo "Usage: $0 --restore-uploads BACKUP_FILE" >&2
                exit 1
            fi
            ;;
        --restore-all)
            ACTION="restore_all"
            if [ -n "${2:-}" ] && [[ "$2" != --* ]]; then
                TIMESTAMP="$2"
                shift 2
            else
                echo "✗ Timestamp not specified" >&2
                echo "Usage: $0 --restore-all TIMESTAMP" >&2
                exit 1
            fi
            ;;
        --clean)
            ACTION="clean"
            shift
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        -*)
            echo "✗ Unknown option: $1" >&2
            print_help
            exit 1
            ;;
        *)
            # Assume it's a backup type
            case "$1" in
                database|uploads|all)
                    BACKUP_TYPE="$1"
                    ;;
                *)
                    echo "✗ Unknown backup type: $1" >&2
                    echo "Valid types: database, uploads, all" >&2
                    exit 1
                    ;;
            esac
            shift
            ;;
    esac
done

case "$ACTION" in
    create)
        create_backup "$BACKUP_TYPE"
        ;;
    list)
        list_backups
        ;;
    restore_database)
        restore_database_backup "$RESTORE_TARGET"
        ;;
    restore_uploads)
        restore_uploads_backup "$RESTORE_TARGET"
        ;;
    restore_all)
        restore_all_backups "$TIMESTAMP"
        ;;
    clean)
        clean_old_backups
        ;;
    *)
        echo "✗ Invalid action" >&2
        exit 1
        ;;
esac
