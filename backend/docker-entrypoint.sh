#!/bin/sh
set -ex

echo "--- DOCKER ENTRYPOINT SCRIPT STARTED ---"
date
echo "Running as user: $(whoami)"

echo "[Step 1] Creating required directories..."
mkdir -p /var/run/php-fpm
mkdir -p /var/www/storage/logs
mkdir -p /var/www/storage/app/public
mkdir -p /var/www/storage/framework/cache/data
mkdir -p /var/www/storage/framework/sessions
mkdir -p /var/www/storage/framework/views
mkdir -p /var/www/bootstrap/cache
mkdir -p /var/log

# Create log files for scheduler, queue worker, and reverb (supervisor needs them to exist)
touch /var/www/storage/logs/scheduler.log
touch /var/www/storage/logs/scheduler-stdout.log
touch /var/www/storage/logs/scheduler-stderr.log
touch /var/www/storage/logs/queue-worker-stdout.log
touch /var/www/storage/logs/queue-worker-stderr.log
touch /var/www/storage/logs/reverb-stdout.log
touch /var/www/storage/logs/reverb-stderr.log
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
# Only ensure the top-level public directory is writable for creating symlinks
# Avoid recursively chmod'ing mounted subpaths like /var/www/public/docs which may be read-only
chmod 777 /var/www/public || true

# HTTPS for local development is handled by the dedicated https-proxy service in docker-compose.
# The backend container serves HTTP on port 80 only to avoid duplication and confusion.

echo "[Step 4] Preparing environment file and APP_KEY..."

# IMPORTANT:
# - APP_KEY must be stable across deployments. If it changes, all encrypted cookies
#   (including session cookies) become invalid and every user will be logged out.
# - Therefore we do NOT auto-generate APP_KEY on boot.
#
# Provide APP_KEY via docker-compose env_file (backend/.env), environment variables,
# or your secret manager.

if [ -z "${APP_KEY:-}" ]; then
    echo "ERROR: APP_KEY is not set. Refusing to start because regenerating APP_KEY would log out all users."
    echo "Set APP_KEY in backend/.env (or your deployment secret store) to a stable value (base64:...)."
    exit 1
fi

echo "APP_KEY is present in environment."

echo "[Step 4.5] Ensuring Laravel package discovery and Filament assets..."

# Docker image build installs composer deps with --no-scripts to avoid running
# artisan without runtime env. Do the minimum runtime setup here.
if [ ! -f /var/www/bootstrap/cache/packages.php ]; then
    echo "bootstrap/cache/packages.php missing; running package:discover..."
    su -s /bin/sh -c "php artisan package:discover --ansi" www-data
else
    echo "Package discovery cache present; skipping package:discover."
fi

# Filament assets are expected under public/js/filament...
if [ ! -f /var/www/public/js/filament/filament/app.js ]; then
    echo "Filament assets missing; running filament:upgrade..."
    su -s /bin/sh -c "php artisan filament:upgrade" www-data
else
    echo "Filament assets present; skipping filament:upgrade."
fi

# --- MIGRATION CONTROL ---
# By default, migrations are DISABLED in the entrypoint (RUN_MIGRATIONS=false).
# This prevents race conditions when multiple containers start simultaneously
# or when containers restart. Migrations should be run explicitly via deploy.sh
# after the container is healthy. Set RUN_MIGRATIONS=true only for dev/testing.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "[Step 5] Running Migrations..."
    su -s /bin/sh -c "php artisan migrate --force" www-data
    echo "Migrations executed."
else
    echo "[Step 5] Skipped migrations (RUN_MIGRATIONS=false - migrations should be run via deploy.sh)."
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
