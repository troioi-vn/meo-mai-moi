# Development PostgreSQL Database

This directory contains a Docker Compose setup for running PostgreSQL locally for native PHP development (when using `php artisan serve` instead of the full Docker stack).

## Quick Start

1. **Start the database**:
   ```bash
   cd utils/dev-pgsql-docker
   docker compose up -d
   ```

2. **Run Laravel migrations**:
   ```bash
   cd ../../backend
   php artisan migrate:fresh --seed
   php artisan storage:link
   ```

3. **Start the Laravel development server**:
   ```bash
   php artisan serve
   ```

4. **Access the application**:
   - Laravel app: http://localhost:8000
   - PgAdmin: http://localhost:8888
     - Email: admin@example.com
     - Password: admin123

## Database Connection Details

- **Host**: localhost (127.0.0.1)
- **Port**: 5432
- **Database**: meo_mai_moi
- **Username**: user
- **Password**: password

These settings are already configured in `backend/.env`.

## Management

- **Stop the database**: `docker compose down`
- **Reset data**: `docker compose down -v` (removes all data)
- **View logs**: `docker compose logs postgres`

## PgAdmin Setup

After accessing PgAdmin at http://localhost:8888:

1. Click "Add New Server"
2. General tab: Name = "Local Dev"
3. Connection tab:
   - Host: `postgres` (Docker Compose service name for internal container communication)
   - Port: 5432
   - Database: meo_mai_moi
   - Username: user
   - Password: password

## Troubleshooting

- **Connection refused**: Make sure the container is running with `docker compose ps`
- **Permission denied**: The container might still be starting; check `docker compose logs postgres`
- **Database doesn't exist**: Run `php artisan migrate:fresh --seed`