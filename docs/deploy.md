# Production Deployment Guide

This guide provides detailed instructions for deploying the Meo Mai Moi application to a production environment.

## Prerequisites

- Docker and Docker Compose installed on the server.
- Git installed and configured.
- A PostgreSQL database server, either running on the same machine or accessible over the network.

## Environment Configuration

1.  **Create the environment file**: Copy the example environment file:
    ```bash
    cp backend/.env.docker.example backend/.env.docker
    ```

2.  **Configure the environment variables**: Edit `backend/.env.docker` and set the following variables:
    *   `APP_URL`: The public URL of your application.
    *   `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: Connection details for your PostgreSQL database.
    *   `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`: Configuration for your email sending service.

## Deployment Steps

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/troioi-vn/meo-mai-moi.git
    cd meo-mai-moi
    ```

2.  **Build and start the containers**:
    ```bash
    docker compose up -d --build
    ```

3.  **Run database migrations**:
    ```bash
    docker compose exec backend php artisan migrate --force
    ```

4.  **Seed the database** (optional, for a fresh installation with sample data):
    ```bash
    docker compose exec backend php artisan db:seed
    ```

5.  **Generate the application key**:
    ```bash
    docker compose exec backend php artisan key:generate
    ```

6.  **Create the storage link**:
    ```bash
    docker compose exec backend php artisan storage:link
    ```

7.  **Set up the admin user**:
    ```bash
    docker compose exec backend php artisan shield:super-admin
    ```

## Updating the Application

To update the application to the latest version, follow these steps:

1.  **Pull the latest changes**:
    ```bash
    git pull origin main
    ```

2.  **Rebuild and restart the containers**:
    ```bash
    docker compose up -d --build
    ```

3.  **Run database migrations**:
    ```bash
    docker compose exec backend php artisan migrate --force
    ```

4.  **Clear the cache**:
    ```bash
    docker compose exec backend php artisan optimize:clear
    ```