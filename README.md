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

Local development (without Docker)
Backend (SQLite)
- cd backend
- cp .env.example .env
- composer install
- php artisan key:generate
- php artisan migrate:fresh --seed
- php artisan storage:link
- php artisan serve  # http://localhost:8000

Frontend
- cd frontend
- npm install
- npm run dev  # http://localhost:5173 (proxies API to 8000)

Testing
- Backend (Docker): docker compose exec backend php artisan test
- Backend (local): cd backend && ./vendor/bin/pest
- Frontend: cd frontend && npm test

Build pipeline (SPA + Blade)
- cd frontend && npm run build
    - vite build → outputs to frontend/dist
    - scripts/update-blade.cjs → writes backend/resources/views/welcome.blade.php with hashed assets
    - scripts/copy-assets.cjs → copies dist → backend/public/build
Result: Laravel serves React SPA via view('welcome'), linking /public/build assets.

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

License
MIT.

Contributor notes
See GEMINI.md for an agent-oriented overview of architecture and workflows.

