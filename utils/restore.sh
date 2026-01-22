#!/bin/bash
# This script interactively restores the database or user uploads from a backup.
# It is designed to be run from anywhere within the project.

# --- DEPRECATED ---
# This script is deprecated. Please use ./utils/backup.sh for all backup and restore operations.
# The new backup.sh provides better validation, checksum verification, and supports both database and uploads.
# ---

set -e

# --- Configuration ---
# Find the project root (assuming this script is in a 'scripts' directory)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/backups"

# Check if docker compose is available (try both old and new syntax)
if command -v "docker" >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "✗ Docker Compose is not available"
    exit 1
fi

# Dynamically get config from the running container
DB_USER=$($DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db printenv POSTGRES_USER | tr -d '\r')
DB_NAME=$($DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db printenv POSTGRES_DB | tr -d '\r')
# IMPORTANT: The volume name is based on the project's directory name.
# If your root directory is 'meo-mai-moi', the volume will be 'meo-mai-moi_uploads_data'.
DOCKER_VOLUME_NAME="$(basename "$PROJECT_ROOT")_uploads_data"

# --- Functions ---

# Function to restore the database
restore_db() {
    echo "Please select a database backup file to restore:"
    # Use a subshell to change directory for file selection
    (
        shopt -s nullglob
        cd "$BACKUP_DIR"
        # Look for all supported backup formats
        local files=()
        for pattern in "backup-*.sql.gz" "db_backup_*.sql" "backup-*.sql"; do
            for f in $pattern; do
                if [ -f "$f" ]; then
                    files+=("$f")
                fi
            done
        done

        if [ ${#files[@]} -eq 0 ]; then
            echo "No database backup files found in $BACKUP_DIR"
            echo "Supported formats: backup-*.sql.gz, db_backup_*.sql, backup-*.sql"
            return
        fi

        # Sort files by modification time (newest first)
        IFS=$'\n' files=($(ls -t "${files[@]}"))
        unset IFS

        select DB_BACKUP_FILE in "${files[@]}"; do
            if [ -n "$DB_BACKUP_FILE" ]; then
                # Show backup file details
                local file_size
                file_size=$(du -h "$DB_BACKUP_FILE" | cut -f1)
                local file_date
                file_date=$(stat -c %y "$DB_BACKUP_FILE" | cut -d '.' -f1)

                echo ""
                echo "Backup Details:"
                echo "  File: $DB_BACKUP_FILE"
                echo "  Size: $file_size"
                echo "  Date: $file_date"
                echo ""

                read -p "Are you sure you want to restore '$DB_BACKUP_FILE'? This will overwrite the current database. (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    echo "Restoring database '$DB_NAME' as user '$DB_USER'..."

                    # Drop and recreate database
                    $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>/dev/null || true
                    $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

                    # Restore based on file type
                    if [[ "$DB_BACKUP_FILE" == *.gz ]]; then
                        if gunzip -c "$BACKUP_DIR/$DB_BACKUP_FILE" | $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d "$DB_NAME"; then
                            echo "✓ Database restoration complete."
                        else
                            echo "✗ Database restoration failed."
                            exit 1
                        fi
                    else
                        if cat "$BACKUP_DIR/$DB_BACKUP_FILE" | $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d "$DB_NAME"; then
                            echo "✓ Database restoration complete."
                        else
                            echo "✗ Database restoration failed."
                            exit 1
                        fi
                    fi
                else
                    echo "Restore cancelled."
                fi
                break
            else
                echo "Invalid selection. No backup files found or selection out of range."
                break
            fi
        done
    )
}

# Function to restore user uploads
restore_uploads() {
    echo "Please select an uploads backup file to restore:"
    (cd "$BACKUP_DIR" && select UPLOADS_BACKUP_FILE in uploads_backup_*.tar.gz; do
        if [ -n "$UPLOADS_BACKUP_FILE" ]; then
            read -p "Are you sure you want to restore '$UPLOADS_BACKUP_FILE'? This will overwrite current uploads. (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Restoring uploads..."
                # Clear the volume first to ensure a clean restore
                echo "Clearing existing uploads..."
                docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume" alpine sh -c "rm -rf /volume/*"
                # Restore from backup
                echo "Copying from backup..."
                docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume" -v "$BACKUP_DIR:/backup" alpine tar -xzvf "/backup/${UPLOADS_BACKUP_FILE}" -C /volume
                echo "Uploads restoration complete."
            else
                echo "Restore cancelled."
            fi
            break
        else
            echo "Invalid selection. No backup files found or selection out of range."
            break
        fi
    done)
}

# --- Pre-flight checks ---
echo "⚠️  DEPRECATED: This script is deprecated."
echo "   Please use './utils/backup.sh' for all backup and restore operations."
echo ""
echo "   New commands:"
echo "     ./utils/backup.sh --list                              # List backups"
echo "     ./utils/backup.sh --restore-database <file>          # Restore database"
echo "     ./utils/backup.sh --restore-uploads <file>           # Restore uploads"
echo "     ./utils/backup.sh --restore-all <timestamp>          # Restore both"
echo ""
echo "   Continuing with legacy restore.sh for now..."
echo ""

echo "Performing pre-flight checks..."

# Check if project has docker-compose.yml
if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    echo "✗ docker-compose.yml not found in $PROJECT_ROOT"
    exit 1
fi

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "✗ Backup directory not found: $BACKUP_DIR"
    echo "  Create backups first with: $SCRIPT_DIR/backup.sh"
    exit 1
fi

echo "✓ Pre-flight checks passed"
echo ""

# --- Main Menu ---
echo "What would you like to restore?"
PS3="Enter your choice: "
select choice in "Database" "Uploads" "Both" "Exit"; do
    case $choice in
        "Database")
            restore_db
            break
            ;;
        "Uploads")
            restore_uploads
            break
            ;;
        "Both")
            echo "Please select a database backup file to restore:"
            # Find all database backup files
            (
                cd "$BACKUP_DIR"
                local db_files=()
                for pattern in "backup-*.sql.gz" "db_backup_*.sql" "backup-*.sql"; do
                    for f in $pattern; do
                        if [ -f "$f" ]; then
                            db_files+=("$f")
                        fi
                    done
                done

                if [ ${#db_files[@]} -eq 0 ]; then
                    echo "No database backup files found in $BACKUP_DIR"
                    break
                fi

                # Sort by modification time (newest first)
                IFS=$'\n' db_files=($(ls -t "${db_files[@]}"))
                unset IFS

                select DB_BACKUP_FILE in "${db_files[@]}"; do
                    if [ -n "$DB_BACKUP_FILE" ]; then
                        echo "Please select an uploads backup file to restore:"
                        (cd "$BACKUP_DIR" && select UPLOADS_BACKUP_FILE in uploads_backup_*.tar.gz; do
                            if [ -n "$UPLOADS_BACKUP_FILE" ]; then
                                # Show details for both files
                                local db_size db_date uploads_size uploads_date
                                db_size=$(du -h "$DB_BACKUP_FILE" | cut -f1)
                                db_date=$(stat -c %y "$DB_BACKUP_FILE" | cut -d '.' -f1)
                                uploads_size=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
                                uploads_date=$(stat -c %y "$UPLOADS_BACKUP_FILE" | cut -d '.' -f1)

                                echo ""
                                echo "Backup Details:"
                                echo "  Database: $DB_BACKUP_FILE ($db_size, $db_date)"
                                echo "  Uploads:  $UPLOADS_BACKUP_FILE ($uploads_size, $uploads_date)"
                                echo ""

                                read -p "Are you sure you want to restore both files? This will overwrite the current database and uploads. (y/n) " -n 1 -r
                                echo
                                if [[ $REPLY =~ ^[Yy]$ ]]; then
                                    echo "Restoring database '$DB_NAME' as user '$DB_USER'..."

                                    # Drop and recreate database
                                    $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>/dev/null || true
                                    $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

                                    # Restore database based on file type
                                    if [[ "$DB_BACKUP_FILE" == *.gz ]]; then
                                        if gunzip -c "$BACKUP_DIR/$DB_BACKUP_FILE" | $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d "$DB_NAME"; then
                                            echo "✓ Database restoration complete."
                                        else
                                            echo "✗ Database restoration failed."
                                            exit 1
                                        fi
                                    else
                                        if cat "$BACKUP_DIR/$DB_BACKUP_FILE" | $DOCKER_COMPOSE_CMD -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U "$DB_USER" -d "$DB_NAME"; then
                                            echo "✓ Database restoration complete."
                                        else
                                            echo "✗ Database restoration failed."
                                            exit 1
                                        fi
                                    fi

                                    echo "---"
                                    echo "Restoring uploads..."
                                    echo "Clearing existing uploads..."
                                    docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume" alpine sh -c "rm -rf /volume/*"
                                    echo "Copying from backup..."
                                    if docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume" -v "$BACKUP_DIR:/backup" alpine tar -xzvf "/backup/${UPLOADS_BACKUP_FILE}" -C /volume; then
                                        echo "✓ Uploads restoration complete."
                                    else
                                        echo "✗ Uploads restoration failed."
                                        exit 1
                                    fi
                                else
                                    echo "Restore cancelled."
                                fi
                                break
                            else
                                echo "Invalid selection. No backup files found or selection out of range."
                                break
                            fi
                        done)
                        break
                    else
                        echo "Invalid selection. No backup files found or selection out of range."
                        break
                    fi
                done
            )
            break
            ;;
        "Exit")
            echo "Exiting."
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done