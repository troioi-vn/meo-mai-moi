# Multi-stage build: First stage for building frontend
FROM node:18 AS frontend-build

WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies (cached if package.json hasn't changed)
RUN npm ci

# Copy source code after dependencies
COPY frontend ./

# Build the application
RUN npm run build:docker

# Second stage: PHP backend with built frontend
FROM php:8.4-fpm

# Set working directory
WORKDIR /var/www

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y \
    # Runtime dependencies
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libonig-dev \
    libzip-dev \
    libpq-dev \
    libicu-dev \
    locales \
    zip \
    unzip \
    curl \
    nginx \
    supervisor \
    # Build dependencies (will be removed later)
    build-essential

# Install PHP extensions
RUN docker-php-ext-install mbstring zip exif pcntl intl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd \
    && docker-php-ext-install pdo_pgsql

# Remove build dependencies to reduce image size
RUN apt-get purge -y build-essential && apt-get autoremove -y

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy custom PHP-FPM pool configuration
COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf

# Create log files and set permissions
RUN touch /var/log/php-fpm-error.log /var/log/php-fpm-access.log \
    && chown www-data:www-data /var/log/php-fpm-error.log /var/log/php-fpm-access.log \
    && chmod 664 /var/log/php-fpm-error.log /var/log/php-fpm-access.log

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set up permissions for www-data user early
RUN chown -R www-data:www-data /var/www

# Copy composer files first for better dependency caching
COPY backend/composer.json backend/composer.lock ./

# Switch to www-data user to install dependencies
USER www-data
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-plugins

# Switch back to root for copying files and system operations
USER root

# Copy backend application
COPY backend .

# Copy built frontend from first stage
COPY --from=frontend-build /frontend/dist ./public/build

# Copy Docker-specific environment file
COPY backend/.env.docker /var/www/.env

# Create necessary Laravel directories and set permissions
RUN mkdir -p bootstrap/cache storage/app storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 storage bootstrap/cache

# Complete composer installation with scripts (as root since we need Laravel setup)
RUN composer install --no-dev --optimize-autoloader

# Create storage link for file uploads
RUN php artisan storage:link

# Copy nginx configuration
COPY backend/nginx-docker.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 80
EXPOSE 80

# Start supervisor (manages both nginx and php-fpm)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]