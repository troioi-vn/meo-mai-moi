#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.docker.example"
DEPLOY_LOG="$PROJECT_ROOT/.deploy.log"

# Preserve original stdout/stderr so we can write concise messages even in quiet mode
exec 3>&1 4>&2

# Start logging (default: mirror to console + log). If --quiet is passed later, we'll reconfigure.
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
for cmd in docker; do
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
Usage: ./utils/deploy.sh [--fresh] [--seed] [--no-cache] [--no-interactive] [--quiet] [--allow-empty-db]

Flags:
    --fresh          Drop and recreate database, re-run all migrations; also clears volumes/containers.
    --seed           Seed the database after running migrations (or migrate:fresh).
    --no-cache       Build Docker images without using cache.
    --no-interactive Skip confirmation prompts (useful for automated scripts/CI).
    --quiet          Reduce console output; full logs go to .deploy.log.
    --allow-empty-db Allow deployment to proceed even if database appears empty (non-fresh).

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
    - Deploy will BLOCK if DB appears empty (unless --allow-empty-db or --seed)
EOF
}

## (Removed) get_db_stats and check_db_connection helpers to simplify deployment flow


# --- Main Script ---

# Parse command-line arguments
MIGRATE_COMMAND="migrate"
SEED="false"
NO_CACHE="false"
FRESH="false"
NO_INTERACTIVE="false"
QUIET="false"
ALLOW_EMPTY_DB="false"

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
        --quiet)
            QUIET="true"
            ;;
        --allow-empty-db)
            ALLOW_EMPTY_DB="true"
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

# --- Logging configuration post-args ---
# Provide a helper for concise console notes while keeping full logs in the file.
note() {
    # Always write to log (stdout). In quiet mode, also print to the preserved console (fd 3).
    echo "$1"
    if [ "$QUIET" = "true" ]; then
        echo "$1" >&3
    fi
}

# Run a command and stream its output to the console when in quiet mode
# This preserves full logs while still showing progress (e.g., docker build)
run_cmd_with_console() {
    if [ "$QUIET" = "true" ]; then
        # Stream to console (fd 3) and to log (stdout)
        "$@" 2>&1 | tee /proc/self/fd/3
    else
        "$@"
    fi
}

DEFAULT_ADMIN_EMAIL="admin@catarchy.space"
ADMIN_EMAIL_TO_WATCH=${ADMIN_EMAIL_TO_WATCH:-}

if [ -f "$ENV_FILE" ]; then
    DB_USERNAME_ENV=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
    DB_DATABASE_ENV=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
    ADMIN_EMAIL_ENV=$(grep -E '^SEED_ADMIN_EMAIL=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
else
    DB_USERNAME_ENV=""
    DB_DATABASE_ENV=""
    ADMIN_EMAIL_ENV=""
fi

if [ -z "$ADMIN_EMAIL_TO_WATCH" ]; then
    if [ -n "$ADMIN_EMAIL_ENV" ]; then
        ADMIN_EMAIL_TO_WATCH="$ADMIN_EMAIL_ENV"
    else
        ADMIN_EMAIL_TO_WATCH="$DEFAULT_ADMIN_EMAIL"
    fi
fi

DB_USERNAME_ENV=${DB_USERNAME_ENV:-user}
DB_DATABASE_ENV=${DB_DATABASE_ENV:-meo_mai_moi}
DB_VOLUME_NAME=${DB_VOLUME_NAME:-$(basename "$PROJECT_ROOT")_pgdata}
DB_FINGERPRINT_FILE="$PROJECT_ROOT/.db_volume_fingerprint"

db_query() {
    local query="$1"
    local result
    if ! result=$(docker compose exec -T db psql -U "$DB_USERNAME_ENV" -d "$DB_DATABASE_ENV" -At -c "$query" 2>/dev/null); then
        echo "__ERROR__"
        return 1
    fi
    echo "$result" | tr -d '\r' | sed 's/[[:space:]]*$//'
    return 0
}

db_snapshot() {
    local stage="$1"

    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        note "DB snapshot ($stage): db container not running"
        DB_SNAPSHOT_STAGE="$stage"
        DB_SNAPSHOT_USERS="unavailable"
        DB_SNAPSHOT_ADMIN="unavailable"
        return
    fi

    local total_users
    total_users=$(db_query "SELECT COUNT(*) FROM users;") || total_users="unavailable"
    [ -z "$total_users" ] && total_users="unavailable"

    local admin_present="not_tracked"
    local include_admin="false"
    if [ -n "$ADMIN_EMAIL_TO_WATCH" ] && [ "$ADMIN_EMAIL_TO_WATCH" != "ignore" ]; then
        include_admin="true"
        local admin_count
        admin_count=$(db_query "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL_TO_WATCH';") || admin_count="unavailable"
        if [ "$admin_count" = "__ERROR__" ] || [ "$admin_count" = "unavailable" ]; then
            admin_present="unavailable"
        else
            admin_present=$([ "$admin_count" = "1" ] && echo "present" || echo "missing")
        fi
    fi

    local admin_summary=""
    if [ "$include_admin" = "true" ]; then
        admin_summary=" admin(${ADMIN_EMAIL_TO_WATCH})=${admin_present}"
    fi

    note "DB snapshot ($stage): users=${total_users}${admin_summary}"

    if [ "$include_admin" = "true" ] && [ "$admin_present" = "missing" ]; then
        local recent_users
        recent_users=$(db_query "SELECT id || ':' || email FROM users ORDER BY created_at DESC LIMIT 5;") || recent_users=""
        if [ -n "$recent_users" ] && [ "$recent_users" != "__ERROR__" ]; then
            note "Recent users ($stage):"
            while IFS= read -r line; do
                [ -n "$line" ] && note "  - $line"
            done <<EOF
$recent_users
EOF
        fi
    fi
    DB_SNAPSHOT_STAGE="$stage"
    DB_SNAPSHOT_USERS="$total_users"
    if [ "$include_admin" = "true" ]; then
        DB_SNAPSHOT_ADMIN="$admin_present"
    else
        DB_SNAPSHOT_ADMIN="not_tracked"
    fi
}

if [ "$QUIET" = "true" ]; then
    # Reduce console noise: route stdout/stderr to log file, keep fd 3 for concise messages
    exec 1>>"$DEPLOY_LOG" 2>&1
    printf "ℹ️  Quiet mode enabled. Full logs: %s\n" "$DEPLOY_LOG" >&3
fi

# --- Pre-deployment Checks --- (simplified)
# Optional backup before making changes (recommended for production)
if [ "$FRESH" = "false" ] && [ "$NO_INTERACTIVE" = "false" ]; then
    echo ""
    read -r -p "Would you like to backup the database first? (y/N): " do_backup
    if [[ "$do_backup" =~ ^[yY]([eE][sS])?$ ]]; then
        note "Preparing to run backup..."
        # Ensure DB container is running for backup script
        if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
            note "Starting database container for backup..."
            run_cmd_with_console docker compose up -d db
            # Wait briefly for db health (best-effort)
            WAIT_TIMEOUT=60
            WAIT_INTERVAL=2
            elapsed=0
            while [ "$elapsed" -lt "$WAIT_TIMEOUT" ]; do
                if docker compose ps db 2>/dev/null | grep -q '(healthy)'; then
                    note "✓ Database is healthy for backup"
                    break
                fi
                sleep "$WAIT_INTERVAL"
                elapsed=$((elapsed + WAIT_INTERVAL))
            done
        fi

        if [ -f "$SCRIPT_DIR/backup.sh" ]; then
            run_cmd_with_console "$SCRIPT_DIR/backup.sh"
            note "✓ Backup complete"
        else
            note "⚠️  Backup script not found at $SCRIPT_DIR/backup.sh"
        fi
    fi
fi

db_snapshot "before-stop"

EMPTY_DB_DETECTED="false"
if [ "$DB_SNAPSHOT_USERS" = "0" ]; then
    EMPTY_DB_DETECTED="true"
fi

if [ "$FRESH" = "false" ] && [ "$EMPTY_DB_DETECTED" = "true" ] && [ "$ALLOW_EMPTY_DB" = "false" ] && [ "$SEED" = "false" ]; then
    echo ""
    echo "✗ Empty database detected before deployment."
    echo "  Use --seed to populate essential data, or --allow-empty-db to proceed anyway."
    echo "  To quickly recreate the admin: docker compose exec backend php artisan db:seed --class=UserSeeder --force"
    exit 1
fi

if [ "$SEED" = "false" ] && [ "$DB_SNAPSHOT_ADMIN" = "missing" ] && [ -n "$ADMIN_EMAIL_TO_WATCH" ] && [ "$ADMIN_EMAIL_TO_WATCH" != "ignore" ]; then
    note "⚠️  Admin user $ADMIN_EMAIL_TO_WATCH missing before deployment."
    if [ "$NO_INTERACTIVE" = "false" ]; then
        read -r -p "Run UserSeeder to recreate core users now? (Y/n): " seed_admin
        if [[ ! "$seed_admin" =~ ^[nN]([oO])?$ ]]; then
            note "Running targeted seeder (UserSeeder)..."
            run_cmd_with_console docker compose exec backend php artisan db:seed --class=UserSeeder --force
            db_snapshot "post-user-seeder"
        fi
    else
        note "ℹ️  Re-run with --seed or execute 'docker compose exec backend php artisan db:seed --class=UserSeeder --force' to recreate core users."
    fi
fi

VOLUME_CREATED_AT=""
VOLUME_FINGERPRINT_CHANGED="false"
if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
    VOLUME_CREATED_AT=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .CreatedAt }}')
    note "ℹ️  Volume $DB_VOLUME_NAME created at $VOLUME_CREATED_AT"
    if [ -f "$DB_FINGERPRINT_FILE" ]; then
        PREV_FINGERPRINT=$(cat "$DB_FINGERPRINT_FILE" 2>/dev/null || true)
        if [ -n "$PREV_FINGERPRINT" ] && [ "$PREV_FINGERPRINT" != "$VOLUME_CREATED_AT" ]; then
            VOLUME_FINGERPRINT_CHANGED="true"
            echo "⚠️  DB volume fingerprint changed. Previous: $PREV_FINGERPRINT | Current: $VOLUME_CREATED_AT"
        fi
    fi
    # Persist current fingerprint for future runs
    echo "$VOLUME_CREATED_AT" > "$DB_FINGERPRINT_FILE"
else
    note "⚠️  Database volume $DB_VOLUME_NAME not found."
fi

# (moved) Postgres cluster initialization detection will run AFTER containers are up,
# scoped to the current db container start time to avoid stale warnings

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
    note "ℹ️  Standard deployment (data preservation mode)"
    note "ℹ️  Data preservation: Docker volumes will be preserved (no data loss)"
    note "Stopping containers..."
    docker compose stop 2>/dev/null || true
fi

echo ""
note "Building and starting containers..."
BUILD_ARGS=()
if [ "$NO_CACHE" = "true" ]; then
    echo "Building without cache..."
    run_cmd_with_console docker compose build --no-cache
    BUILD_ARGS+=(-d)
else
    BUILD_ARGS+=(--build -d)
fi

run_cmd_with_console docker compose up "${BUILD_ARGS[@]}"

# --- Wait for Backend Health ---
note "Waiting for backend to become healthy..."
WAIT_TIMEOUT=300
WAIT_INTERVAL=5
elapsed=0

while [ "$elapsed" -lt "$WAIT_TIMEOUT" ]; do
    if docker compose ps backend 2>/dev/null | grep -q '(healthy)'; then
        note "✓ Backend is healthy"
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

## Detect Postgres initdb only for current DB container lifetime
DB_CONTAINER_ID=$(docker compose ps -q db 2>/dev/null || true)
if [ -n "$DB_CONTAINER_ID" ]; then
    DB_STARTED_AT=$(docker inspect -f '{{.State.StartedAt}}' "$DB_CONTAINER_ID" 2>/dev/null || true)
    if [ -n "$DB_STARTED_AT" ]; then
        if docker logs --since "$DB_STARTED_AT" "$DB_CONTAINER_ID" 2>/dev/null | grep -q "The database cluster will be initialized"; then
            echo "⚠️  Postgres cluster initialization detected for current container start (fresh data directory)."
        fi
    fi
fi

# After a --fresh reset, update the stored DB volume fingerprint to the NEW CreatedAt
if [ "$FRESH" = "true" ]; then
    if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
        NEW_CREATED_AT=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .CreatedAt }}' 2>/dev/null || true)
        if [ -n "$NEW_CREATED_AT" ]; then
            echo "$NEW_CREATED_AT" > "$DB_FINGERPRINT_FILE"
            note "ℹ️  Updated DB volume fingerprint after fresh reset: $NEW_CREATED_AT"
        fi
    fi
fi

db_snapshot "after-up"

## (Removed) post-start DB stats re-check

echo ""
note "Running database $MIGRATE_COMMAND..."
# NOTE: Migrations are intentionally run HERE (not in container entrypoint) to:
# 1. Prevent race conditions when multiple containers start
# 2. Allow explicit control and verification of schema changes
# 3. Enable pre-migration checks (backups, data verification)
# 4. Support zero-downtime deployments with controlled migration timing
run_cmd_with_console docker compose exec backend php artisan "$MIGRATE_COMMAND" --force

# --- Seeding Strategy ---
if [ "$MIGRATE_COMMAND" = "migrate:fresh" ]; then
    # Always seed after migrate:fresh to ensure all required data exists
    echo "Seeding database after fresh migration..."
    run_cmd_with_console docker compose exec backend php artisan db:seed --force
    echo "✓ Database seeded successfully"
elif [ "$SEED" = "true" ]; then
    # Explicit --seed flag: run full seeder
    echo "Seeding database..."
    run_cmd_with_console docker compose exec backend php artisan db:seed --force
    echo "✓ Database seeded successfully"
fi

# --- Post-Migration Setup ---
echo ""
note "Generating Filament Shield resources..."
run_cmd_with_console docker compose exec backend php artisan shield:generate --all --panel=admin --minimal

note "Optimizing application..."
run_cmd_with_console docker compose exec backend php artisan optimize

db_snapshot "after-migrate"

## (Removed) post-deployment DB summary for simplicity

echo ""
note "✓ Deployment complete!"
[ "$FRESH" = "false" ] && note "✓ Existing data preserved"
echo ""
note "📝 Full deployment log: $DEPLOY_LOG"
