# Meo Mai Moi — Pet Rehoming Platform Engine

Connecting owners, fosters, and adopters to help pets find new homes. Built with Laravel, React, and PostgreSQL.

Dockerized • Laravel 12 • React 19 • Vite 7 • PostgreSQL 14 • Filament 3

## Quick Start (Docker)

1) Clone and setup
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
# Prepare Docker env file (will prompt for APP_URL and FRONTEND_URL, or keep defaults)
./utils/ensure-docker-env.sh
# Build and start containers
docker compose up -d --build
# Optional: initialize app data
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

Access:
- App: http://localhost:8000
- Admin: http://localhost:8000/admin (admin@catarchy.space / password) (local dev)

## Documentation

- Development guide: docs/development.md
- Deployment: docs/deploy.md
- Project docs site: docs/index.md
- Agent/architecture: GEMINI.md

## How to Participate

We welcome contributions of all sizes — features, fixes, tests, and docs.

1) Get set up (Docker Quick Start)
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
./utils/ensure-docker-env.sh
docker compose up -d --build
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

2) Read the Development Guide
- Start here for local setup, daily workflow, testing, and Git practices to avoid merge conflicts: `docs/development.md`

3) Create a branch and code
```bash
git checkout -b feature/your-change
# make small, focused commits
git add -p && git commit -m "feat: do one thing"
```

4) Run tests and format
```bash
# Backend
docker compose exec backend php artisan test
cd backend && ./vendor/bin/pint

# Frontend
cd frontend && npm test
cd frontend && npm run lint && npm run typecheck
```

5) Open a Pull Request
- Push your branch and open a PR to `dev`. Keep PRs small when possible.
- Include screenshots for UI changes and mention tests added/updated.

For architecture context, see `GEMINI.md` (AI Agent Guide).

## Admin Panel Features (highlights)

- Pet management: profiles, photos, medical records, status filters, pet type support
- Weight tracking: per-pet weight history with owner CRUD; enable per pet type via Pet Types → "Weight tracking allowed"
- Users & helpers: verification, suspension, moderation tools
- Placement & transfer: request workflow, foster assignments, handovers
- Reviews moderation: hide/flag, bulk actions, filters
- RBAC: Spatie Permission + Filament Shield