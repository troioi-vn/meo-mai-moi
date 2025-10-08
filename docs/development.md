# Development Guide

Quick reference for running, developing, and testing Meo Mai Moi locally.

## Quick Start

**New to the repo?** Follow these steps to get running:

1. **Run the app**
   ```bash
   docker compose up -d --build
   ```

2. **Initialize (first time only)**
   ```bash
   docker compose exec backend php artisan migrate:fresh --seed
   docker compose exec backend php artisan shield:generate --all
   docker compose exec backend php artisan storage:link
   ```

3. **Access the app**
   - Main app: http://localhost:8000
   - Admin panel: http://localhost:8000/admin (admin@catarchy.space / password)
   - API docs: http://localhost:8000/api/documentation

## Daily Workflow

```bash
# Start services
docker compose up -d

# Frontend development (hot reload)
cd frontend && npm run dev  # → http://localhost:5173

# Run tests
docker compose exec backend php artisan test
cd frontend && npm test

# Generate coverage reports
cd frontend && npm run test:coverage  # → frontend/coverage/index.html

# Stop services
docker compose down
```

## Tech Stack Overview

**Backend**: Laravel 11 + PHP 8.4
- Pet management with health tracking
- Placement & transfer workflows  
- Email notifications & admin panel
- Sanctum auth + Spatie permissions
- Full OpenAPI documentation

**Frontend**: React 18 + TypeScript + Vite
- Pet profiles & health management
- Request workflows & notifications
- shadcn/ui + Tailwind CSS
- 238+ tests with Vitest

## Related Documentation

- [Testing Guide](./testing.md) - Comprehensive testing instructions
- [Git Workflow](./git-workflow.md) - Branching strategy and conflict resolution
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Deployment](./deploy.md) - Production deployment guide
- [Architecture](../GEMINI.md) - System architecture overview

## Quick Commands

```bash
# Development
docker compose up -d --build
docker compose exec backend php artisan test
cd frontend && npm test && npm run lint

# Code quality
docker compose exec backend ./vendor/bin/pint
cd frontend && npm run typecheck

# Coverage reports
cd frontend && npm run test:coverage

# Reset environment
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
```