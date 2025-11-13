# Multi-stage build: First stage for building the entire application
FROM node:22.17.1 AS app-build

ARG VAPID_PUBLIC_KEY
ENV VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY

# Set the working directory for the entire application
WORKDIR /app

# Update npm to the latest version
RUN npm install -g npm@11.5.2

##
# Build Frontend SPA assets
##
# Copy package files first to leverage Docker cache
COPY ./frontend/package.json ./frontend/package-lock.json /app/frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy the rest of the source code
COPY ./frontend /app/frontend
COPY ./backend /app/backend

# Build the frontend SPA (copies to /app/backend/public/build via script)
WORKDIR /app/frontend
RUN npm ci
RUN npm run build:docker

##
# No backend JS build: backend is API-only. Frontend SPA build already copied into /app/backend/public/build.

# Second stage: Final PHP image
FROM php:8.4-fpm

# Set working directory
WORKDIR /var/www

# Install system dependencies
ARG INSTALL_XDEBUG=true
ARG INSTALL_DEV=false
RUN apt-get update && apt-get install -y \
	libpng-dev libjpeg62-turbo-dev libfreetype6-dev libonig-dev libzip-dev \
	libpq-dev libicu-dev locales zip unzip curl nginx supervisor procps net-tools postgresql-client \
	libwebp-dev \
 && if [ "$INSTALL_XDEBUG" = "true" ]; then pecl install xdebug >/dev/null 2>&1 && docker-php-ext-enable xdebug; fi

# Install PHP extensions
RUN docker-php-ext-install mbstring zip exif pcntl intl pdo_pgsql     && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp     && docker-php-ext-install gd

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy custom PHP-FPM pool configuration
COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY backend/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY backend/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini
RUN rm /usr/local/etc/php-fpm.d/www.conf.default && rm /usr/local/etc/php-fpm.d/zz-docker.conf

RUN mkdir -p /var/run/php-fpm && chown www-data:www-data /var/run/php-fpm && chmod 775 /var/run/php-fpm

# Install Composer (pinned for reproducible builds; 2.8+ fixes E_STRICT notices on PHP 8.4)
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Copy the entire backend application from the build stage,
# including the Blade file that was updated by the frontend build.
COPY --from=app-build --chown=www-data:www-data /app/backend .

# Copy the built frontend assets from the build stage (already copied by script)
# Note: Frontend build step copied to /app/backend/public/build during build stage.
# We don't need an extra copy here. Keep backend Inertia assets in public/build-inertia.

# Create Laravel's cache and storage directories with correct ownership
RUN install -d -o www-data -g www-data \
	bootstrap/cache \
	storage/framework/sessions \
	storage/framework/views \
	storage/logs \
 && chmod -R 775 /var/www/storage /var/www/bootstrap/cache \
 && chown www-data:www-data /var/www

##
# Composer installation
# By default we install production dependencies only. For test/coverage builds
# pass --build-arg INSTALL_DEV=true to include dev packages (phpunit, pest, etc.).
##
USER www-data
RUN rm -f bootstrap/cache/packages.php && if [ "$INSTALL_DEV" = "true" ]; then composer install --no-interaction --prefer-dist; else composer install --no-dev --optimize-autoloader; fi

# Switch back to root for final setup
USER root

# Copy configurations and the new entrypoint script
COPY backend/nginx-docker.conf /etc/nginx/sites-available/default
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80 for Nginx
EXPOSE 80

# Set the entrypoint to our new script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
