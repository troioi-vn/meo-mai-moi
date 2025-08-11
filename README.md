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

This is the easiest way to get started. The setup uses a single `docker-compose.yml` file for all services.

**1. Environment Setup**

The Docker container uses a layered environment configuration:

1.  **Base Configuration:** A `.env` file is automatically generated from `.env.example` inside the container if it doesn't exist. An `APP_KEY` is also generated on first run.
2.  **Docker Overrides:** The `docker-compose.yml` file is configured to use `backend/.env.docker` as an `env_file`. This is the **recommended way to override** default settings for development.

To get started, copy the Docker-specific example file. This file is pre-configured to connect to the PostgreSQL container.

```bash
# From the project root directory
cp backend/.env.docker.example backend/.env.docker
```

**2. First-Time Setup**

```bash
# Clone the project
git clone https://github.com/your-username/meo-mai-moi.git
cd meo-mai-moi

# Build and start the Docker containers in the background
docker compose up -d --build

# Run the initial application setup (for development)
# This command drops the database and seeds it with test data.
docker compose exec backend php artisan migrate:fresh --seed && \
docker compose exec backend php artisan shield:generate --all
```

**2. Accessing the Application**

-   **Application URL:** [http://localhost:8000](http://localhost:8000)
-   **Admin Panel:** [http://localhost:8000/admin](http://localhost:8000/admin)
    -   **Email:** `admin@example.com`
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

-	**With Docker:** `docker compose exec backend php artisan test`
-	**Without Docker:** `cd backend && ./vendor/bin/pest`

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
```

---

## Build Process

The frontend and backend builds are interconnected. For a production-like build, you need to compile the frontend assets and move them to the backend.

**1. Build the Frontend**

```bash
cd frontend
npm run build
```

This command does the following:

1.  **`vite build`**: Compiles the React/TypeScript application into static HTML, CSS, and JavaScript files in the `frontend/dist` directory.
2.  **`npm run blade:update`**: Updates the `backend/resources/views/welcome.blade.php` file with the correct, hashed asset paths from the build output.
3.  **`npm run assets:copy`**: Copies the compiled assets from `frontend/dist/assets` to `backend/public/build/assets`.

After running this command, your Laravel backend will be able to serve the compiled frontend application.

## License

This project is licensed under the **MIT License**.

---

## Contributor Guide for Humans and AI Agents

For a concise, agent-oriented overview of architecture, workflows, testing, and common pitfalls, see `GEMINI.md`.

