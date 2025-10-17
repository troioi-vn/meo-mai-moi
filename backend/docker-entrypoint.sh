#!/bin/sh
set -ex

echo "--- DOCKER ENTRYPOINT SCRIPT STARTED ---"
date
echo "Running as user: $(whoami)"

echo "[Step 1] Creating required directories..."
mkdir -p /var/run/php-fpm
mkdir -p /var/www/storage/logs
mkdir -p /var/www/storage/app/public
mkdir -p /var/log
echo "Directories created."

echo "[Step 1.5] Waiting for database to be ready..."
# Use environment variables if provided (docker-compose env_file passes these in)
DB_HOST_NAME=${DB_HOST:-db}
DB_PORT_NUMBER=${DB_PORT:-5432}
DB_CHECK_USER=${DB_USERNAME:-user}
DB_CHECK_DB=${DB_DATABASE:-postgres}

# Set password for pg_isready
export PGPASSWORD=${DB_PASSWORD}

# Only check server reachability here (host:port). Don't depend on user/db existing yet.
MAX_TRIES=60
TRY=1
until pg_isready -h "$DB_HOST_NAME" -p "$DB_PORT_NUMBER" -U "$DB_CHECK_USER" -t 3 -q; do
    if [ $TRY -ge $MAX_TRIES ]; then
        echo "Database is still unavailable after $MAX_TRIES attempts; proceeding anyway to let Laravel report details..."
        break
    fi
    echo "Database is unavailable (attempt $TRY/$MAX_TRIES) - sleeping"
    TRY=$((TRY+1))
    sleep 2
done
echo "Database check complete - continuing..."

echo "[Step 2] Setting permissions..."
chown -R www-data:www-data /var/run/php-fpm
chown -R www-data:www-data /var/www/storage
chmod -R 775 /var/run/php-fpm
chmod -R 775 /var/www/storage
echo "Permissions set. Current permissions:"
ls -ld /var/run/php-fpm
ls -ld /var/www/storage

echo "[Step 3] Ensuring correct ownership for public storage..."
chown -R www-data:www-data /var/www/storage/app/public
chmod -R 775 /var/www/storage/app/public

# Some environments mount the project as a bind mount; don't change ownership of
# /var/www/public (host files). Just ensure it exists and is writable so storage:link works.
echo "[Step 3.1] Ensuring permissions for public directory (for storage:link)..."
mkdir -p /var/www/public
chmod -R 777 /var/www/public

echo "[Step 4] Preparing environment file and APP_KEY..."
# Ensure an application .env exists inside the container
if [ ! -f /var/www/.env ]; then
    if [ -f /var/www/.env.docker ]; then
        echo "No .env found, copying from .env.docker"
        cp /var/www/.env.docker /var/www/.env
    else
        echo "No .env found, copying from .env.docker.example"
        cp /var/www/.env.docker.example /var/www/.env
    fi
    chown www-data:www-data /var/www/.env
fi

# Generate the APP_KEY directly into .env if missing
if ! grep -q '^APP_KEY=base64:' /var/www/.env; then
    echo "No APP_KEY in .env, generating one..."
    su -s /bin/sh -c "php artisan key:generate --force" www-data
    echo "APP_KEY generated in .env."
else
    echo "APP_KEY already present in .env."
fi

# Ensure the process environment gets a valid APP_KEY even if docker env_file provided an empty one
APP_KEY_FROM_ENV_FILE=${APP_KEY:-}
APP_KEY_FROM_DOTENV=$(grep '^APP_KEY=' /var/www/.env | cut -d '=' -f2-)
if [ -n "$APP_KEY_FROM_DOTENV" ] && [ "$APP_KEY_FROM_DOTENV" != "$APP_KEY_FROM_ENV_FILE" ]; then
    export APP_KEY="$APP_KEY_FROM_DOTENV"
    echo "Exported APP_KEY from .env for runtime."
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[Step 5] Running Migrations..."
    su -s /bin/sh -c "php artisan migrate --force" www-data
    echo "Migrations executed."
else
    echo "[Step 5] Skipped migrations (RUN_MIGRATIONS=false)."
fi

echo "[Step 6] Linking storage..."
# Some environments may not have DB/cache ready yet (e.g., when migrations are
# deliberately run later from the host). Allow ignoring optimize:clear failures
# when IGNORE_OPTIMIZE_CLEAR_FAILURE=true. Default is strict (fail on error).
if [ "${IGNORE_OPTIMIZE_CLEAR_FAILURE:-false}" = "true" ]; then
    su -s /bin/sh -c "php artisan optimize:clear || true; php artisan storage:link --force" www-data
    echo "Storage linked (optimize:clear failures are ignored)."
else
    su -s /bin/sh -c "php artisan optimize:clear && php artisan storage:link --force" www-data
    echo "Storage linked."
fi

echo "[Step 7] Testing PHP-FPM configuration..."
/usr/local/sbin/php-fpm -t
echo "PHP-FPM configuration test passed."

echo "[Step 8] Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
