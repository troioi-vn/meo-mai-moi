#!/usr/bin/env bash
set -euo pipefail

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

if [ "$FRESH" = "true" ]; then
    echo "⚠️  FRESH deploy requested: stopping and removing containers and volumes..."
    echo "⚠️  WARNING: All database data and volumes will be DELETED"
    
    if [ "$NO_INTERACTIVE" = "false" ]; then
        echo ""
        read -p "Are you sure you want to DELETE all database data and volumes? (yes/no): " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "❌ Deployment cancelled."
            exit 1
        fi
    fi
    
    # Best-effort stop; ignore errors if not running
    docker compose down -v || true
else
    echo "ℹ️  Normal deploy (data preservation mode)"
    echo "ℹ️  Existing database data will be PRESERVED"
    echo "ℹ️  Only new migrations will be applied"
    # Do NOT call docker compose down - keep containers alive to preserve database
    # Just stop the services
    docker compose stop || true
fi

echo ""
echo "Building and starting Docker containers..."
if [ "$NO_CACHE" = "true" ]; then
    docker compose build --no-cache
    docker compose up -d
else
    docker compose up -d --build
fi

echo "Waiting for backend container to be ready..."
WAIT_TIMEOUT=300
WAIT_INTERVAL=5
time_spent=0
while [ "$time_spent" -lt "$WAIT_TIMEOUT" ]; do
    status_line=$(docker compose ps backend 2>/dev/null || true)
    if echo "$status_line" | grep -q '(healthy)'; then
        echo "✓ Backend container is healthy."
        break
    fi
    echo "  Backend container not healthy yet, waiting... ($time_spent/$WAIT_TIMEOUT seconds)"
    sleep "$WAIT_INTERVAL"
    time_spent=$((time_spent + WAIT_INTERVAL))
done

if [ "$time_spent" -ge "$WAIT_TIMEOUT" ]; then
    echo "✗ Timed out waiting for backend container to become healthy." >&2
    docker compose logs backend || true
    exit 1
fi

echo ""
echo "Running database $MIGRATE_COMMAND..."
docker compose exec backend php artisan "$MIGRATE_COMMAND" --force

# Check if we need to seed (if PetType records are missing, seed required data)
if [ "$MIGRATE_COMMAND" = "migrate:fresh" ]; then
    # Always seed after migrate:fresh
    echo "Seeding database after fresh migration..."
    docker compose exec backend php artisan db:seed --force
elif [ "$SEED" = "true" ]; then
    echo "Seeding database..."
    docker compose exec backend php artisan db:seed --force
else
    # Check if pet types exist - they're required for the app to function
    PET_TYPE_COUNT=$(docker compose exec -T db psql -U user -d meo_mai_moi -c "SELECT COUNT(*) FROM pet_types;" 2>/dev/null | grep -oE '^[[:space:]]*[0-9]+' | tr -d ' ' || echo "0")
    if [ "$PET_TYPE_COUNT" = "0" ]; then
        echo "⚠️  Database is missing required seed data (pet types)."
        echo "⚠️  Running seeders to populate system data..."
        docker compose exec backend php artisan db:seed --class=PetTypeSeeder --force
    fi
fi

echo ""
echo "Generating Filament Shield resources..."
docker compose exec backend php artisan shield:generate --all --panel=admin

echo ""
echo "✓ Deployment complete!"
if [ "$FRESH" = "false" ]; then
    echo "✓ Database data has been preserved"
fi

echo "Deployment script finished successfully!"
