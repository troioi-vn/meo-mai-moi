#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.docker.example"
DEPLOY_LOG="$PROJECT_ROOT/.deploy.log"

# Start logging
exec > >(tee -a "$DEPLOY_LOG") 2>&1
echo "=========================================="
echo "Deployment started at $(date)"
echo "=========================================="

# Ensure .env.docker exists before proceeding
if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
    echo "ℹ️  'backend/.env.docker' not found. Copying from example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

# Validate required tools
for cmd in docker psql; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "✗ Required command '$cmd' not found. Please install it first." >&2
        exit 1
    fi
done

# Trap errors for better debugging
trap 'echo "✗ Deployment failed at line $LINENO. Check $DEPLOY_LOG for details." >&2' ERR

# --- Helper Functions ---

# Function to print help message
print_help() {
    cat <<'EOF'
Usage: ./utils/deploy.sh [--fresh] [--seed] [--no-cache] [--no-interactive]

Flags:
    --fresh          Drop and recreate database, re-run all migrations; also clears volumes/containers.
    --seed           Seed the database after running migrations (or migrate:fresh).
    --no-cache       Build Docker images without using cache.
    --no-interactive Skip confirmation prompts (useful for automated scripts/CI).

Default behavior (no flags):
    - Build and start containers (preserves existing database data)
    - Wait for backend to be healthy
    - Run database migrations only (no seeding, no data loss)

Examples:
    ./utils/deploy.sh                          # normal deploy (migrate only, preserves data)
    ./utils/deploy.sh --seed                   # migrate + seed
    ./utils/deploy.sh --fresh                  # reset DB/volumes (asks for confirmation)
    ./utils/deploy.sh --fresh --seed           # fresh + seed (asks for confirmation)
    ./utils/deploy.sh --fresh --no-interactive # fresh without prompts (for CI/automation)
    ./utils/deploy.sh --no-cache               # rebuild images without cache

IMPORTANT: Data Preservation
    - Without --fresh: All existing database data is PRESERVED
    - The pgdata Docker volume is NOT removed (only containers stop)
    - Only NEW migrations are applied
    - Use --fresh ONLY if you want a clean slate with no old data
EOF
}

# Function to get database stats (table and row counts)
# Note: Uses 127.0.0.1 instead of DB_HOST because this script runs on the host machine
get_db_stats() {
    local env_file="${1:-backend/.env.docker}"
    
    if [ ! -f "$env_file" ]; then
        echo "0 0"
        return
    fi

    (
        set -o allexport
        # shellcheck source=/dev/null
        source "$env_file"
        set +o allexport
        export PGPASSWORD="$DB_PASSWORD"

        # Always use 127.0.0.1 for host checks since the script runs outside Docker
        if ! pg_isready -h "127.0.0.1" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -q 2>/dev/null; then
            echo "0 0"
            return
        fi

        local table_count
        table_count=$(psql -h "127.0.0.1" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

        if [ "$table_count" -gt 0 ]; then
            local row_count
            row_count=$(psql -h "127.0.0.1" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c \
                "SELECT SUM((xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint)
                 FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
            echo "$table_count ${row_count:-0}"
        else
            echo "0 0"
        fi
    )
}

# Function to check database connectivity
# Note: Uses 127.0.0.1 instead of DB_HOST because this script runs on the host machine
# where Docker container names (like "db") are not resolvable, but the port is exposed to localhost
check_db_connection() {
    local env_file="${1:-backend/.env.docker}"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi

    (
        set -o allexport
        # shellcheck source=/dev/null
        source "$env_file"
        set +o allexport
        export PGPASSWORD="$DB_PASSWORD"
        
        # Always use 127.0.0.1 for host checks since the script runs outside Docker
        # The DB_HOST in .env.docker is "db" (container name) which only works inside Docker network
        pg_isready -h "127.0.0.1" -p "${DB_PORT:-5432}" \
                   -U "${DB_USERNAME:-user}" -d "${DB_DATABASE:-meo_mai_moi}" -q 2>/dev/null
    )
}


# --- Main Script ---

# Parse command-line arguments
MIGRATE_COMMAND="migrate"
SEED="false"
NO_CACHE="false"
FRESH="false"
NO_INTERACTIVE="false"

for arg in "$@"; do
    case "$arg" in
        --fresh)
            FRESH="true"
            MIGRATE_COMMAND="migrate:fresh"
            ;;
        --seed)
            SEED="true"
            ;;
        --no-cache)
            NO_CACHE="true"
            ;;
        --no-interactive)
            NO_INTERACTIVE="true"
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            print_help
            exit 1
            ;;
    esac
done

# --- Pre-deployment Checks and Stats ---
BEFORE_TABLE_COUNT=0
BEFORE_ROW_COUNT=0

# Only check DB stats if we're doing a normal deploy (not fresh, not seeding)
if [ "$FRESH" = "false" ]; then
    echo "Checking database status..."
    
    if ! check_db_connection "$ENV_FILE"; then
        echo "⚠️  Database connection failed."
        if [ "$NO_INTERACTIVE" = "false" ]; then
            read -r -p "Would you like to start the database container? (Y/n): " start_db
            if [[ ! "$start_db" =~ ^[nN]([oO])?$ ]]; then
                echo "Starting database container..."
                docker compose up -d db
                sleep 5
                
                if ! check_db_connection "$ENV_FILE"; then
                    echo "✗ Database is still not reachable. Continuing anyway..." >&2
                fi
            fi
        fi
    fi
    
    # Get current DB stats for comparison
    read -r BEFORE_TABLE_COUNT BEFORE_ROW_COUNT < <(get_db_stats "$ENV_FILE")
    
    if [ "$BEFORE_TABLE_COUNT" -gt 0 ]; then
        echo "📊 Database status: $BEFORE_TABLE_COUNT tables, $BEFORE_ROW_COUNT total rows"
        
        # Offer backup for non-empty databases
        if [ "$NO_INTERACTIVE" = "false" ]; then
            read -r -p "Would you like to backup the database first? (y/N): " do_backup
            if [[ "$do_backup" =~ ^[yY]([eE][sS])?$ ]]; then
                echo "Creating backup..."
                if [ -f "$SCRIPT_DIR/backup.sh" ]; then
                    "$SCRIPT_DIR/backup.sh"
                    echo "✓ Backup complete"
                else
                    echo "⚠️  Backup script not found at $SCRIPT_DIR/backup.sh"
                fi
            fi
        fi
    else
        echo "📊 Database is empty (fresh install)"
    fi
fi

# --- Container Management ---
if [ "$FRESH" = "true" ]; then
    echo ""
    echo "⚠️  FRESH deployment: All data and volumes will be DELETED"
    
    if [ "$NO_INTERACTIVE" = "false" ]; then
        read -r -p "Type 'yes' to confirm deletion of all data: " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
    fi
    
    echo "Removing containers and volumes..."
    docker compose down -v --remove-orphans || {
        echo "⚠️  docker compose down returned non-zero (containers may not have been running)"
    }
    echo "✓ Cleanup complete"
else
    echo ""
    echo "ℹ️  Standard deployment (data preservation mode)"
    echo "Stopping containers..."
    docker compose stop 2>/dev/null || true
fi

echo ""
echo "Building and starting containers..."
BUILD_ARGS=()
if [ "$NO_CACHE" = "true" ]; then
    echo "Building without cache..."
    docker compose build --no-cache
    BUILD_ARGS+=(-d)
else
    BUILD_ARGS+=(--build -d)
fi

docker compose up "${BUILD_ARGS[@]}"

# --- Wait for Backend Health ---
echo "Waiting for backend to become healthy..."
WAIT_TIMEOUT=300
WAIT_INTERVAL=5
elapsed=0

while [ "$elapsed" -lt "$WAIT_TIMEOUT" ]; do
    if docker compose ps backend 2>/dev/null | grep -q '(healthy)'; then
        echo "✓ Backend is healthy"
        break
    fi
    
    printf "⏳ Waiting... (%d/%ds)\r" "$elapsed" "$WAIT_TIMEOUT"
    sleep "$WAIT_INTERVAL"
    elapsed=$((elapsed + WAIT_INTERVAL))
done

if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
    echo ""
    echo "✗ Backend failed to become healthy within ${WAIT_TIMEOUT}s" >&2
    echo "Recent logs:" >&2
    docker compose logs --tail=20 backend >&2
    exit 1
fi
echo ""

echo ""
echo "Running database $MIGRATE_COMMAND..."
# NOTE: Migrations are intentionally run HERE (not in container entrypoint) to:
# 1. Prevent race conditions when multiple containers start
# 2. Allow explicit control and verification of schema changes
# 3. Enable pre-migration checks (backups, data verification)
# 4. Support zero-downtime deployments with controlled migration timing
docker compose exec backend php artisan "$MIGRATE_COMMAND" --force

# --- Seeding Strategy ---
if [ "$MIGRATE_COMMAND" = "migrate:fresh" ]; then
    # Always seed after migrate:fresh to ensure all required data exists
    echo "Seeding database after fresh migration..."
    docker compose exec backend php artisan db:seed --force
    echo "✓ Database seeded successfully"
elif [ "$SEED" = "true" ]; then
    # Explicit --seed flag: run full seeder
    echo "Seeding database..."
    docker compose exec backend php artisan db:seed --force
    echo "✓ Database seeded successfully"
fi

# --- Post-Migration Setup ---
echo ""
echo "Generating Filament Shield resources..."
docker compose exec backend php artisan shield:generate --all --panel=admin --minimal

echo "Optimizing application..."
docker compose exec backend php artisan optimize

# --- Post-deployment Summary ---
if [ "$BEFORE_TABLE_COUNT" -gt 0 ]; then
    read -r AFTER_TABLE_COUNT AFTER_ROW_COUNT < <(get_db_stats "$ENV_FILE")
    
    echo ""
    echo "📊 Database Summary:"
    echo "   Before: $BEFORE_TABLE_COUNT tables, $BEFORE_ROW_COUNT rows"
    echo "   After:  $AFTER_TABLE_COUNT tables, $AFTER_ROW_COUNT rows"
    
    if [ "$BEFORE_TABLE_COUNT" -eq "$AFTER_TABLE_COUNT" ] && \
       [ "$BEFORE_ROW_COUNT" -eq "$AFTER_ROW_COUNT" ]; then
        echo "   Status: ✓ No data changes"
    else
        echo "   Status: ℹ️  Data modified during deployment"
    fi
fi

echo ""
echo "✓ Deployment complete!"
[ "$FRESH" = "false" ] && echo "✓ Existing data preserved"
echo ""
echo "📝 Full deployment log: $DEPLOY_LOG"
