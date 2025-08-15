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
until pg_isready -h db -p 5432 -U user -d meo_mai_moi -q; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is up - continuing..."

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

echo "[Step 5] Running Migrations..."
su -s /bin/sh -c "php artisan migrate --force" www-data
echo "Migrations executed."

echo "[Step 6] Linking storage..."
su -s /bin/sh -c "php artisan optimize:clear && php artisan storage:link --force" www-data
echo "Storage linked."

echo "[Step 7] Testing PHP-FPM configuration..."
/usr/local/sbin/php-fpm -t
echo "PHP-FPM configuration test passed."

echo "[Step 8] Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
