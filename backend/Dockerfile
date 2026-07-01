ARG PHP_RUNTIME_IMAGE=registry.int.catarchy.space/troioi-vn/meo-mai-moi/runtime-base:php-8.5-fpm-20260531

# Multi-stage build: generate OpenAPI spec from backend source so frontend build
# does not depend on a committed storage artifact.
FROM ${PHP_RUNTIME_IMAGE} AS openapi-build

COPY ./backend/composer.json ./backend/composer.lock /var/www/

RUN install -d \
	bootstrap/cache \
	storage/framework/cache/data \
	storage/framework/sessions \
	storage/framework/views \
	storage/logs \
 && composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

COPY ./backend /var/www

RUN php artisan package:discover --ansi \
 && php artisan l5-swagger:generate

# Multi-stage build: First stage for building the entire application
FROM oven/bun:1 AS app-build

ENV DEBIAN_FRONTEND=noninteractive \
	TERM=xterm

ARG VAPID_PUBLIC_KEY
ENV VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY

ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME
ARG VITE_TELEGRAM_BOT_USERNAME
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME

ARG VITE_UMAMI_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_DOMAINS
ARG VITE_UMAMI_DEBUG
ARG VITE_UMAMI_LAZY_LOAD
ARG VITE_ADMIN_URL
ENV VITE_UMAMI_URL=$VITE_UMAMI_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
ENV VITE_UMAMI_DOMAINS=$VITE_UMAMI_DOMAINS
ENV VITE_UMAMI_DEBUG=$VITE_UMAMI_DEBUG
ENV VITE_UMAMI_LAZY_LOAD=$VITE_UMAMI_LAZY_LOAD
ENV VITE_ADMIN_URL=$VITE_ADMIN_URL

# Set the working directory for the entire application
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates \
 && update-ca-certificates \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

##
# Build Frontend SPA assets
##
# Copy package files first to leverage Docker cache
COPY ./frontend/package.json ./frontend/bun.lock /app/frontend/
WORKDIR /app/frontend
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY ./frontend /app/frontend
COPY ./backend /app/backend
COPY --from=openapi-build /var/www/storage/api-docs /app/backend/storage/api-docs

# Generate typesafe API client from the OpenAPI spec created during build.
WORKDIR /app/frontend
RUN bun run api:generate

# Validate translations in the same environment used for deployment builds.
RUN bun run i18n:ci

# Build the frontend SPA (copies to /app/backend/public/build via script)
WORKDIR /app/frontend
RUN bun run build:docker

##
# No backend JS build: backend is API-only. Frontend SPA build already copied into /app/backend/public/build.

# Second stage: Final PHP image
FROM ${PHP_RUNTIME_IMAGE}

ARG INSTALL_DEV=false

# Copy custom PHP-FPM pool configuration
COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY backend/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY backend/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini
RUN rm /usr/local/etc/php-fpm.d/www.conf.default && rm /usr/local/etc/php-fpm.d/zz-docker.conf

RUN mkdir -p /var/run/php-fpm && chown www-data:www-data /var/run/php-fpm && chmod 775 /var/run/php-fpm

# Copy the entire backend application from the build stage,
# including the Blade file that was updated by the frontend build.
COPY --from=app-build --chown=www-data:www-data /app/backend .
COPY --from=openapi-build --chown=www-data:www-data /var/www/vendor ./vendor
RUN test -s /var/www/storage/api-docs/api-docs.json

# Copy the built frontend assets from the build stage (already copied by script)
# Note: Frontend build step copied to /app/backend/public/build during build stage.
# We don't need an extra copy here. Keep backend Inertia assets in public/build-inertia.

# Create Laravel's cache and storage directories with correct ownership
RUN install -d -o www-data -g www-data \
	bootstrap/cache \
	storage/framework/cache/data \
	storage/framework/sessions \
	storage/framework/views \
	storage/logs \
 && chmod -R 775 /var/www/storage /var/www/bootstrap/cache \
 && chown www-data:www-data /var/www

USER www-data
RUN if [ "$INSTALL_DEV" = "true" ]; then composer install --no-interaction --prefer-dist --no-scripts; fi
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
