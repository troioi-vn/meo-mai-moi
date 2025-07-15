# Multi-stage build: First stage for building frontend
FROM node:18 AS frontend-build

# Copy frontend source (adjust path based on build context)
COPY frontend /frontend
WORKDIR /frontend

# Install dependencies and build
RUN npm install
RUN npm run build

# Second stage: PHP backend with built frontend
FROM php:8.2-fpm

# Set working directory
WORKDIR /var/www

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y \
    build-essential \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    locales \
    zip \
    jpegoptim optipng pngquant gifsicle \
    vim \
    unzip \
    git \
    curl \
    libonig-dev \
    libzip-dev \
    libpq-dev \
    nginx \
    supervisor

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring zip exif pcntl
RUN docker-php-ext-configure gd --with-freetype --with-jpeg
RUN docker-php-ext-install gd
RUN docker-php-ext-install pdo_pgsql

# Copy custom PHP-FPM pool configuration
COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf

# Create log files and set permissions
RUN touch /var/log/php-fpm-error.log /var/log/php-fpm-access.log \
    && chown www-data:www-data /var/log/php-fpm-error.log /var/log/php-fpm-access.log \
    && chmod 664 /var/log/php-fpm-error.log /var/log/php-fpm-access.log

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy backend application
COPY backend .

# Copy built frontend from first stage
COPY --from=frontend-build /frontend/dist ./public/build

# Install Laravel dependencies
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Copy nginx configuration
COPY backend/nginx-docker.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 80
EXPOSE 80

# Start supervisor (manages both nginx and php-fpm)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
