# Meo Mai Moi — Cat Rehoming Platform Engine

Connecting owners, fosters, and adopters to help cats find new homes. Built with Laravel, React, and PostgreSQL.

Badges: Dockerized • Laravel 12 • React 19 • Vite 7 • PostgreSQL 14

Contents
- Quick start (Docker)
- Local development
- Testing
- Build pipeline (SPA + Blade)
- Troubleshooting
- Deployment
- License and contributor notes

Quick start (Docker)
1) Copy Docker env and start
     - cp backend/.env.docker.example backend/.env.docker
     - docker compose up -d --build
2) Initialize (dev data, roles/permissions)
     - docker compose exec backend php artisan migrate:fresh --seed
     - docker compose exec backend php artisan shield:generate --all
3) Open
     - App: http://localhost:8000
     - Admin: http://localhost:8000/admin (admin@example.com / password)

**1. First-Time Setup**

```bash
# Clone the project
git clone https://github.com/meo-mai-moi/meo-mai-moi.git
cd meo-mai-moi
```
To get started, copy the Docker-specific example file:

```bash
# Build and start the Docker containers in the background
docker compose up -d --build

# Run the initial application setup (for development)
# This command drops the database and seeds it with test data.
docker compose exec backend php artisan migrate:fresh --seed && \
docker compose exec backend php artisan shield:generate --all && \
docker compose exec backend php artisan storage:link
```

**2. Accessing the Application**

-   **Application URL:** [http://localhost:8000](http://localhost:8000)
-   **Admin Panel:** [http://localhost:8000/admin](http://localhost:8000/admin)
    -   **Email:** `test@example.com`
    -   **Password:** `password`

**3. Daily Workflow**

-   **Start containers:** `docker compose up -d`
-   **Stop containers:** `docker compose down`
-   **Rebuild and restart:** `docker compose up -d --build`

**Note on Production:** For a production deployment, you would not use the `docker-compose.override.yml` file. A full, safe deployment guide is available in [docs/deploy.md](./docs/deploy.md).


### Option 2: Local Development (Without Docker)

This method requires you to have PHP, Composer, and Node.js installed on your machine.

**1. Backend Setup (SQLite)**

```bash
cd backend

# Set up environment file
cp .env.example .env

# Install dependencies
composer install

# Generate app key and run migrations
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link

# Start the backend server
php artisan serve
```
Your backend will be running at `http://localhost:8000`.

**2. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend dev server
npm run dev
```
Your frontend will be running at `http://localhost:5173` with hot-reloading. The Vite server will proxy API requests to your backend at `http://localhost:8000`.

---

## Testing

### Backend Tests (Pest)

- 	**With Docker:** `docker compose exec backend php artisan test`
- 	**Without Docker:** `cd backend && ./vendor/bin/pest`

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
```

Troubleshooting
- storage:link permission denied
    - The container runs storage:link as www-data with safe defaults.
    - If bind-mounting the repo, ensure host perms allow write to backend/public and backend/public/storage.
- Frontend build copy EACCES
    - Fix host perms: chown -R $USER:$USER backend/public && chmod -R u+rwX,go+rX backend/public
    - Re-run: npm --prefix frontend run build
- View [welcome] not found
    - Run frontend build to generate welcome.blade.php (npm --prefix frontend run build)

Deployment
See docs/deploy.md for a safe, step-by-step flow with maintenance mode, backups, zero-downtime rebuild, and rollback.

## License

This project is licensed under the **MIT License**.

Contributor notes
See GEMINI.md for an agent-oriented overview of architecture and workflows.