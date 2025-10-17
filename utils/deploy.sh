#!/usr/bin/env bash
set -euo pipefail

print_help() {
    cat <<'EOF'
Usage: ./tmp/deploy.sh [--fresh] [--seed] [--no-cache]

Flags:
    --fresh     Drop and recreate database, re-run all migrations; also clears volumes/containers.
    --seed      Seed the database after running migrations (or migrate:fresh).
    --no-cache  Build Docker images without using cache.

Default behavior (no flags):
    - Build and start containers
    - Wait for backend to be healthy
    - Run database migrations only (no seeding)

Examples:
    ./tmp/deploy.sh                 # normal deploy (migrate only)
    ./tmp/deploy.sh --seed          # migrate + seed
    ./tmp/deploy.sh --fresh         # reset DB/volumes and migrate fresh (no seed by default)
    ./tmp/deploy.sh --fresh --seed  # reset DB/volumes, migrate fresh, then seed
    ./tmp/deploy.sh --no-cache      # rebuild images without cache
EOF
}

MIGRATE_COMMAND="migrate"
SEED="false"
NO_CACHE="false"
FRESH="false"

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
    echo "Fresh deploy requested: stopping and removing containers and volumes..."
    # Best-effort stop; ignore errors if not running
    docker compose down -v || true
fi

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
        echo "Backend container is healthy."
        break
    fi
    echo "Backend container not healthy yet, waiting..."
    sleep "$WAIT_INTERVAL"
    time_spent=$((time_spent + WAIT_INTERVAL))
done

if [ "$time_spent" -ge "$WAIT_TIMEOUT" ]; then
    echo "Timed out waiting for backend container to become healthy." >&2
    docker compose logs backend || true
    exit 1
fi

echo "Running database $MIGRATE_COMMAND..."
docker compose exec backend php artisan "$MIGRATE_COMMAND" --force

if [ "$SEED" = "true" ]; then
    echo "Seeding database..."
    docker compose exec backend php artisan db:seed --force
fi

echo "Generating Filament Shield resources..."
docker compose exec backend php artisan shield:generate --all --panel=admin

echo "Deployment script finished successfully!"
