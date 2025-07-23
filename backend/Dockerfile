# Multi-stage build: First stage for building the entire application
FROM node:18 AS app-build

# Set the working directory for the entire application
WORKDIR /app

# Copy all source code into the build stage
COPY . .

# Navigate to the frontend directory to build it
WORKDIR /app/frontend
RUN npm ci
# This script now builds Vite and updates the blade file in /app/backend/
RUN npm run build:docker

# Second stage: Final PHP image
FROM php:8.4-fpm

# Set working directory
WORKDIR /var/www

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg62-turbo-dev libfreetype6-dev libonig-dev libzip-dev \
    libpq-dev libicu-dev locales zip unzip curl nginx supervisor

# Install PHP extensions
RUN docker-php-ext-install mbstring zip exif pcntl intl pdo_pgsql \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy custom PHP-FPM pool configuration
COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy the entire backend application from the build stage,
# including the Blade file that was updated by the frontend build.
COPY --from=app-build /app/backend .

# Copy the built frontend assets from the build stage
COPY --from=app-build /app/frontend/dist ./public/build

# Create Laravel's cache and storage directories
RUN mkdir -p bootstrap/cache storage/framework/sessions storage/framework/views storage/logs

# Correctly set ownership for the entire application directory
RUN chown -R www-data:www-data /var/www
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Switch to the application user to install Composer dependencies
USER www-data
RUN composer install --no-dev --optimize-autoloader

# Switch back to root for final setup
USER root

# Create the symbolic link for storage
RUN php artisan storage:link

# Copy Nginx and Supervisor configurations
COPY backend/nginx-docker.conf /etc/nginx/sites-available/default
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 80 for Nginx
EXPOSE 80

# Start Supervisor to manage Nginx and PHP-FPM
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]