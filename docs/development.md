# Development Guide

Everything you need to run, develop, test, and troubleshoot Meo Mai Moi locally.

## If You Don't Know How To Start

Start here if you're new to the repo or want the shortest path to contributing without surprises. This gets you running locally and shows a safe Git flow to avoid conflicts.

1) Run the app
- Docker (recommended):
	- Build and start: `docker compose up -d --build`
	- Initialize (first time):
		- `docker compose exec backend php artisan migrate:fresh --seed`
		- `docker compose exec backend php artisan shield:generate --all`
		- `docker compose exec backend php artisan storage:link`
- Native (fast if you already have PHP/Node): see "Native Development" below

2) Daily workflow
- Start: `docker compose up -d`
- Frontend UI:
	- Option A — Vite dev server with hot reload (frontend work): `cd frontend && npm run dev` → http://localhost:5173
	- Option B — Served by Laravel (Docker or after build): visit http://localhost:8000. If you changed frontend assets, run `cd frontend && npm run build` first.
- Backend tests: `docker compose exec backend php artisan test`
- Frontend tests: `cd frontend && npm test`

3) Minimal Git flow (conflict-resistant)
- Branches: `main` (protected), `dev` (integration), short-lived feature branches
- Always branch from up-to-date `dev`
	- `git fetch origin && git checkout dev && git pull`
	- `git checkout -b feature/your-change`
- Small, focused commits; push early, push often
	- `git add -p && git commit -m "feat: do one thing"`
- Sync with `dev` regularly (at least before finishing)
	- Merge: `git fetch origin && git merge origin/dev`
	- Or Rebase: `git fetch origin && git rebase origin/dev`
- Open a PR: feature → `dev`. After validation, promote `dev` → `main` via PR.

Pre-merge checklist (feature → dev, then dev → main)
- [ ] All tests pass: backend and frontend
- [ ] Format/lint: `./vendor/bin/pint` (backend), `npm run typecheck && npm run lint` (frontend)
- [ ] Rebased/merged latest `dev` (for feature PR) or latest `main` (for dev→main) and resolved any small conflicts
- [ ] OpenAPI docs current (if backend API changed): `docker compose exec backend php artisan l5-swagger:generate`
- [ ] Docs updated if behavior or commands changed

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
If you don't have a Docker env file yet:
```bash
cp backend/.env.docker.example backend/.env.docker
```
Then initialize the application:
```bash
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

3) Access
- App (served by Laravel): http://localhost:8000
- Frontend (Vite dev server, optional): http://localhost:5173
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

## Ownership History Backfill

When deploying the ownership_history feature to existing data, run a backfill to ensure every currently owned pet has an open ownership period for its owner.

Recommended flow
- Dry run first to see what would change
	- php artisan ownership-history:backfill --dry-run
- Execute the backfill
	- php artisan ownership-history:backfill

Notes
- Idempotent: safe to re-run; it only creates missing open records.
- Supports chunking large datasets: use --chunk=500 (default is 200).
- After backfill, new transfers will automatically close/open history during handover completion.

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

# Frontend lint & typecheck
cd frontend && npm run lint && npm run typecheck

# Generate API docs (Docker)
docker compose exec backend php artisan l5-swagger:generate

# Backend code style (Pint)
cd backend && ./vendor/bin/pint
```

---

## Related Docs
- Deployment: ./deploy.md
- Agent/architecture guide: ../GEMINI.md

---

## Git Workflow

- Branches: work on separate branches
- Naming: `feature/task-description` or `fix/bug-description`

Recommended habits
- Keep `main` clean and deployable; do work in short-lived feature branches
- Frequently sync with `main` to prevent large, painful conflicts
- Prefer small PRs; they are easier to review and merge

Merge vs Rebase
- Merge keeps the exact history and is simpler for beginners
	- `git checkout feature/x && git fetch origin && git merge origin/main`
- Rebase rewrites your branch on top of main for a linear history
	- `git checkout feature/x && git fetch origin && git rebase origin/main`
	- If conflicts: resolve, `git add .`, then `git rebase --continue`

Before opening a PR
- Re-sync: `git fetch origin && git merge origin/main` (or rebase)
- Run tests: backend and frontend must be green
- Format code: `./vendor/bin/pint` for backend; `npm run lint` for frontend
- Ensure docs are accurate (e.g., endpoints, commands, environment notes)

Conflict prevention (quick routine)
```bash
git checkout dev            # or your feature branch
git fetch origin
git merge origin/main       # or: git rebase origin/main
# resolve tiny conflicts now, not later
git push
```

Tip: To see what changed in main that you don’t have yet
```bash
git fetch origin
git log dev..origin/main --oneline
```

Optional: Open/merge PRs from the CLI with GitHub CLI
```bash
gh pr create --base main --head feature/x --title "feat: xyz" --body "…"
gh pr status
gh pr view --web
```

## RBAC (short)

- Source of truth: Spatie Laravel Permission. The legacy `users.role` column has been removed.
- Assign roles (examples):
	- In code: `$user->assignRole('admin');`, check with `$user->hasRole(['admin','super_admin'])`.
	- In Tinker:
		- `php artisan tinker`
		- `\App\Models\User::firstWhere('email','admin@catarchy.space')->assignRole('super_admin');`
- Use `$user->can('permission-name')` for granular checks; controllers should defer to policies via `$this->authorize()`.

## Troubleshooting (short)

- Storage link: docker compose exec backend php artisan storage:link
- Admin 403: php artisan shield:generate --all && php artisan db:seed --class=ShieldSeeder
- Reset DB: php artisan migrate:fresh --seed