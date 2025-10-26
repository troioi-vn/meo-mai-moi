#!/bin/bash
# This script creates timestamped backups of the database and user-uploaded files.

set -e

# --- Configuration ---
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%F-%H%M%S)
DB_BACKUP_FILE="db_backup_${TIMESTAMP}.sql"
UPLOADS_BACKUP_FILE="uploads_backup_${TIMESTAMP}.tar.gz"

# Dynamically get config from the running container or .env file
if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps --status=running | grep -q db; then
    DB_USER=$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T db printenv POSTGRES_USER | tr -d '\r')
else
    # Fallback to .env file if db container is not running
    ENV_FILE="$PROJECT_ROOT/backend/.env"
    if [ -f "$ENV_FILE" ]; then
        DB_USER=$(grep DB_USERNAME "$ENV_FILE" | cut -d '=' -f2)
    else
        echo "Error: DB container not running and .env file not found." >&2
        exit 1
    fi
fi

DOCKER_VOLUME_NAME="$(basename "$PROJECT_ROOT")_uploads_data"

# --- Main Script ---
mkdir -p "$BACKUP_DIR"

# 1. Back up the database
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T db pg_dumpall -U "$DB_USER" > "$BACKUP_DIR/$DB_BACKUP_FILE"

# 2. Back up user uploads from the Docker volume
# The tar output is silenced to keep the script clean
docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume:ro" -v "$BACKUP_DIR:/backup" alpine tar -czf "/backup/${UPLOADS_BACKUP_FILE}" -C /volume . > /dev/null 2>&1

# --- Summary ---
DB_BACKUP_SIZE=$(du -h "$BACKUP_DIR/$DB_BACKUP_FILE" | cut -f1)
UPLOADS_BACKUP_SIZE=$(du -h "$BACKUP_DIR/$UPLOADS_BACKUP_FILE" | cut -f1)
UPLOADED_FILES_COUNT=$(tar -tvf "$BACKUP_DIR/$UPLOADS_BACKUP_FILE" | wc -l | xargs)

echo "Backup Complete!"
echo "  - Database:   $DB_BACKUP_SIZE ($DB_BACKUP_FILE)"
echo "  - Uploads:    $UPLOADS_BACKUP_SIZE, $UPLOADED_FILES_COUNT files ($UPLOADS_BACKUP_FILE)"
echo "Backups saved in: $BACKUP_DIR"