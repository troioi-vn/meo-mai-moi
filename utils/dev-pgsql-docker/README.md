# Development PostgreSQL Database

This directory contains a Docker Compose setup for running PostgreSQL locally for native PHP development (when using `php artisan serve` instead of the full Docker stack).

## Quick Start

### Option A: Automated Setup (Recommended)
```bash
cd utils/dev-pgsql-docker
./fresh-db.sh
cd ../../backend
php artisan db:seed
php artisan serve
```

### Option B: Manual Setup
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

After accessing PgAdmin at http://localhost:8888 (admin@example.com / admin123):

1. **First Login**: Use email `admin@example.com` and password `admin123`
2. **Add Server Connection**:
   - Click "Add New Server" or go to Object Explorer → Create → Server
3. **General Tab**: 
   - Name: `Local Dev` (or any name you prefer)
4. **Connection Tab**:
   - Host name/address: `postgres` (Docker Compose service name for internal container communication)
   - Port: `5432`
   - Database: `meo_mai_moi`
   - Username: `user`
   - Password: `password`
5. **Save**: Click "Save" to create the connection

**Important**: Use `postgres` as the host name, not `localhost` or `127.0.0.1`. This is because PgAdmin runs inside a Docker container and needs to connect to the PostgreSQL container using the internal Docker network.

## Troubleshooting

- **Connection refused**: Make sure the container is running with `docker compose ps`
- **Permission denied**: The container might still be starting; check `docker compose logs postgres`
- **Database doesn't exist**: Run `php artisan migrate:fresh --seed`