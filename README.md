# Meo Mai Moi — Cat Rehoming Platform Engine

**Meo Mai Moi** is an open-source web application engine designed to help communities build cat rehoming networks. It connects cat owners with fosters and adopters, supporting a community-driven approach to cat welfare.

## Tech Stack

-	**Backend:** Laravel (PHP) REST API
-	**Frontend:** React (TypeScript) Single Page Application
-	**UI:** Tailwind CSS & shadcn/ui
-	**Database:** PostgreSQL (Docker) & SQLite (local)
-	**Admin Panel:** Filament
-	**Deployment:** Docker

---

## Development Setup

This project can be run with Docker (recommended) or with local PHP/Node servers.

### Option 1: Docker (Recommended)

This is the easiest way to get started, as it handles the database and server configuration for you.

**1. First-Time Setup**

```bash
# Clone the project
git clone https://github.com/your-username/meo-mai-moi.git
cd meo-mai-moi

# Build and start the Docker containers in the background
docker compose up -d --build

# Run the initial application setup
docker compose exec backend php artisan migrate:fresh --seed && \
docker compose exec backend php artisan shield:generate --all && \
docker compose exec backend php artisan storage:link
```

**2. Accessing the Application**

-	**Application URL:** [http://localhost:8000](http://localhost:8000)
-	**Admin Panel:** [http://localhost:8000/admin](http://localhost:8000/admin)
    -	**Email:** `test@example.com`
    -	**Password:** `password`

**3. Daily Workflow**

-	**Start containers:** `docker compose up -d`
-	**Stop containers:** `docker compose down`
-	**Rebuild and restart:** `docker compose up -d --build`

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

-	**With Docker:** `docker compose exec backend php artisan test`
-	**Without Docker:** `cd backend && ./vendor/bin/pest`

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
```

## License

This project is licensed under the **MIT License**.
