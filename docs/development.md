# Development Guide

Everything you need to run, develop, test, and troubleshoot Meo Mai Moi locally.

## Quick Paths

- Docker (recommended): complete, reproducible environment
- Native (without Docker): fastest iteration if you already have PHP/Node installed

---

## Docker Development (Recommended)

1) Start services
```bash
docker compose up -d --build
```

2) Initialize app (first time or when resetting DB)
```bash
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

3) Access
- Frontend: http://localhost:8000
- Admin: http://localhost:8000/admin
  - Email: admin@catarchy.space
  - Password: password

Daily workflow
```bash
# start
docker compose up -d
# stop
docker compose down
# rebuild
docker compose up -d --build
# reset DB
docker compose exec backend php artisan migrate:fresh --seed
```

---

## Native Development (Without Docker)

Requirements
- PHP 8.4+
- Composer
- Node.js 18+
- SQLite (recommended for local)

1) Backend
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan shield:generate --all
php artisan storage:link
php artisan serve
```

2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Alternative: Build and serve via Laravel (no Vite dev server)
```bash
# Build the frontend once
cd frontend
npm run build

# Serve via Laravel (if not already running from the Backend step)
cd ../backend
php artisan serve

# Access the app at
# http://localhost:8000  (serves the freshly built frontend)
```

Access points
- Backend API: http://localhost:8000
- Frontend: http://localhost:5173 (proxies to backend)
- Admin Panel: http://localhost:8000/admin

Tip: If you see 403 on /admin, regenerate permissions
```bash
php artisan shield:generate --all
php artisan db:seed --class=ShieldSeeder
```

---

## Testing

Backend (Pest/PHPUnit)
```bash
# With Docker
docker compose exec backend php artisan test

# Without Docker
cd backend && php artisan test

# Run a specific test
php artisan test tests/Feature/ReviewResourceTest.php
```

Frontend (Vitest)
```bash
cd frontend
npm test
```

Coverage focus
- Feature tests: API endpoints, resource management, permissions
- Unit tests: model relationships, validation, business logic
- Integration tests: admin panel functionality, user workflows

---

## Troubleshooting

Storage link permission denied
```bash
# Docker
docker compose exec backend php artisan storage:link

# Native
sudo chown -R $USER:$USER backend/storage backend/bootstrap/cache
chmod -R 775 backend/storage backend/bootstrap/cache
```

Frontend build errors or missing assets
```bash
# Fix permissions
chown -R $USER:$USER backend/public
chmod -R u+rwX,go+rX backend/public

# Rebuild frontend
cd frontend && npm run build
```

Admin Panel 403 errors
```bash
php artisan shield:generate --all
php artisan db:seed --class=ShieldSeeder
php artisan shield:super-admin # optional
```

Database issues
```bash
# Reset database with sample data
php artisan migrate:fresh --seed
php artisan shield:generate --all
```

Missing welcome view after fresh clone
```bash
cd frontend && npm run build
```

Development tips
- Hot reloading: frontend runs on port 5173 with Vite
- API testing: use /api endpoints for frontend integration
- Admin access: use a super admin account for full permissions
- Sample data: run seeders for realistic test data

---

## Useful Commands

```bash
# Build and start (Docker)
docker compose up -d --build

# Backend tests (Docker)
docker compose exec backend php artisan test

# Frontend tests
cd frontend && npm test

# Generate API docs (Docker)
docker compose exec backend php artisan l5-swagger:generate
```

---

## Related Docs
- Deployment: ./deploy.md
- Agent/architecture guide: ../GEMINI.md

---

## Git Workflow

- Branches: work on separate branches
- Naming: `feature/task-description` or `fix/bug-description`
