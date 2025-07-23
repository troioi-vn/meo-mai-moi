#!/bin/sh
# This script will log every command and its output to a file.
exec > /tmp/entrypoint.log 2>&1
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

echo "[Step 3] Linking storage..."
php artisan storage:link
echo "Storage linked."

echo "[Step 4] Testing PHP-FPM configuration..."
/usr/local/sbin/php-fpm -t
echo "PHP-FPM configuration test passed."

echo "[Step 5] Starting supervisord..."
# This is the final command and will take over the process.
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf