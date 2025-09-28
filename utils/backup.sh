#!/bin/bash
# This script creates timestamped backups of the database and user-uploaded files.
# It is designed to be run from anywhere within the project.

set -e

# --- Configuration ---
# Find the project root (assuming this script is in a 'scripts' directory)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%F-%H%M%S)
DB_BACKUP_FILE="db_backup_${TIMESTAMP}.sql"
UPLOADS_BACKUP_FILE="uploads_backup_${TIMESTAMP}.tar.gz"

# Dynamically get config from the running container
DB_USER=$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T db printenv POSTGRES_USER | tr -d '\r')
# IMPORTANT: The volume name is based on the project's directory name.
# If your root directory is 'meo-mai-moi', the volume will be 'meo-mai-moi_uploads_data'.
DOCKER_VOLUME_NAME="$(basename "$PROJECT_ROOT")_uploads_data"

# --- Main Script ---
echo "Starting backup process..."
echo "Project root: $PROJECT_ROOT"
echo "Backup directory: $BACKUP_DIR"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# 1. Back up the database
echo "Backing up PostgreSQL database as user '$DB_USER'..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T db pg_dumpall -U "$DB_USER" > "$BACKUP_DIR/$DB_BACKUP_FILE"
echo "Database backup created: $BACKUP_DIR/$DB_BACKUP_FILE"

# 2. Back up user uploads from the Docker volume
echo "Backing up user uploads volume..."
docker run --rm -v "${DOCKER_VOLUME_NAME}:/volume:ro" -v "$BACKUP_DIR:/backup" alpine tar -czvf "/backup/${UPLOADS_BACKUP_FILE}" -C /volume .
echo "Uploads backup created: $BACKUP_DIR/$UPLOADS_BACKUP_FILE"

echo ""
echo "Backup complete!"