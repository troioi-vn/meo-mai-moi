# Production Deployment Guide

This guide provides detailed instructions for deploying the Meo Mai Moi application to a production environment.

## Prerequisites

- Docker and Docker Compose installed on the server.
- Git installed and configured.
- A PostgreSQL database server, either running on the same machine or accessible over the network.

## Environment Configuration

1.  **Create the environment file**:

    **Option A - Automatic (recommended):**

    ```bash
    cd backend
    # The .env file will be auto-created from .env.docker.example when you run artisan
    php artisan --version
    # You'll see: ✓ Created .env from .env.docker.example
    ```

    **Option B - Manual:**

    ```bash
    cp backend/.env.docker.example backend/.env
    ```

2.  **Configure the environment variables**: Edit `backend/.env` and set the following variables:
    - `APP_URL`: The public URL of your application.
    - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: Connection details for your PostgreSQL database.
    - `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`: Configuration for your email sending service.

## Deployment Steps

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/troioi-vn/meo-mai-moi.git
    cd meo-mai-moi
    ```

2.  **Configure environment** (see Environment Configuration section above):

    ```bash
    cd backend
    php artisan --version  # Auto-creates .env from .env.docker.example
    # Edit backend/.env with your production settings
    cd ..
    ```

3.  **Build and start the containers**:

    ```bash
    docker compose up -d --build
    ```

4.  **Run database migrations**:

    ```bash
    docker compose exec backend php artisan migrate --force
    ```

5.  **Seed the database** (optional, for a fresh installation with sample data):

    ```bash
    docker compose exec backend php artisan db:seed
    ```

6.  **Generate the application key**:

    ```bash
    docker compose exec backend php artisan key:generate
    ```

7.  **Create the storage link**:

    ```bash
    docker compose exec backend php artisan storage:link
    ```

8.  **Set up the admin user**:
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

## Important Notes

### Migration Strategy

- Migrations run **only via deploy script**, not during container startup
- This prevents race conditions when multiple containers start or restart
- The `RUN_MIGRATIONS=false` environment variable in docker-compose.yml enforces this
- For production: Always backup before migrations (`./utils/backup.sh`)

### Zero-Downtime Deployments

1. Run migrations first (they should be backward-compatible)
2. Deploy new containers
3. Run post-deployment verification

```

```
