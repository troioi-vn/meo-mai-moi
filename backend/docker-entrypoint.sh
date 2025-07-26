#!/bin/sh
set -ex

echo "--- DOCKER ENTRYPOINT SCRIPT STARTED ---"
date
echo "Running as user: $(whoami)"

echo "[Step 1] Creating required directories..."
mkdir -p /var/run/php-fpm
mkdir -p /var/www/storage/logs
mkdir -p /var/log
echo "Directories created."

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

echo "[Step 4] Generating app key if it does not exist..."
if ! grep -q "APP_KEY=base64" /var/www/.env.docker; then
    echo "No APP_KEY found, generating one..."
    su -s /bin/sh -c "php /var/www/artisan key:generate --env=docker" www-data
    echo "APP_KEY generated."
else
    echo "APP_KEY already exists."
fi

echo "[Step 5] Linking storage..."
su -s /bin/sh -c "php artisan optimize:clear && php artisan storage:link" www-data
echo "Storage linked."

echo "[Step 6] Testing PHP-FPM configuration..."
/usr/local/sbin/php-fpm -t
echo "PHP-FPM configuration test passed."

echo "[Step 7] Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf