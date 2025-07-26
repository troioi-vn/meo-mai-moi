#!/bin/bash
# This script interactively restores the database or user uploads from a backup.
# It is designed to be run from anywhere within the project.

# --- WARNING ---
# THIS IS A DESTRUCTIVE OPERATION.
# It will overwrite your current database or uploaded files.
# ---

set -e

# --- Configuration ---
# Find the project root (assuming this script is in a 'scripts' directory)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/backups"
# IMPORTANT: The volume name is based on the project's directory name.
# If your root directory is 'meo-mai-moi', the volume will be 'meo-mai-moi_uploads_data'.
DOCKER_VOLUME_NAME="$(basename "$PROJECT_ROOT")_uploads_data"

# --- Functions ---

# Function to restore the database
restore_db() {
    echo "Please select a database backup file to restore:"
    # Use a subshell to change directory for file selection
    (cd "$BACKUP_DIR" && select DB_BACKUP_FILE in db_backup_*.sql; do
        if [ -n "$DB_BACKUP_FILE" ]; then
            read -p "Are you sure you want to restore '$DB_BACKUP_FILE'? This will overwrite the current database. (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Restoring database..."
                cat "$BACKUP_DIR/$DB_BACKUP_FILE" | docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T db psql -U user
                echo "Database restoration complete."
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
            restore_db
            echo "---"
            restore_uploads
            break
            ;;
        "Exit")
            echo "Exiting."
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done
