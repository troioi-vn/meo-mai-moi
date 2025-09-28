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
- Keep your feature in sync with `dev` (at least before finishing)
	- Merge: `git fetch origin && git merge origin/dev`
	- Or Rebase (preferred for linear history): `git fetch origin && git rebase origin/dev`
- Open a PR: feature → `dev`. After validation, promote `dev` → `main` via PR.
- Using GitHub CLI (optional):
	- Create PR to dev: `gh pr create --base dev --head feature/your-change --title "feat: …" --body "…"`
	- Change PR base if needed: `gh pr edit <number> --base dev`
	- View PR: `gh pr view --web`

Pre-merge checklist (feature → dev, then dev → main)
- [ ] All tests pass: backend and frontend
- [ ] Format/lint: `./vendor/bin/pint` (backend), `npm run typecheck && npm run lint` (frontend)
- [ ] Rebased/merged latest `dev` (for feature PR) or latest `main` (for dev→main) and resolved any small conflicts
- [ ] OpenAPI docs current (if backend API changed): `docker compose exec backend php artisan l5-swagger:generate`
- [ ] Docs updated if behavior or commands changed

Quick conflict-resolution routine
```bash
# Make sure you're on your feature branch
git checkout feature/your-change
git fetch origin

# For large conflicts or complex merges, consider creating a dedicated merge branch
# This allows for systematic resolution without affecting your original feature branch
git checkout -b merge/resolve-conflicts-$(date +%Y%m%d)
git merge origin/dev

# Resolve conflicts systematically:
# 1. Use 'git status' to see all conflicted files
# 2. For add/add conflicts: choose dev version or manually merge
# 3. For content conflicts: manually resolve keeping both sides where appropriate
# 4. For generated files: prefer dev version and regenerate if needed

# After resolving all conflicts
git add -A
git commit -m "resolve: merge conflicts with dev"

# Option A: Rebase (preferred for clean history)
git rebase origin/dev
# If conflicts during rebase: resolve, then
git add -A
git rebase --continue

# Option B: Keep merge commit
git checkout feature/your-change
git merge merge/resolve-conflicts-$(date +%Y%m%d)

# Push updated branch (force-with-lease for rebases)
git push --force-with-lease

# Clean up temporary branch
git branch -D merge/resolve-conflicts-$(date +%Y%m%d)
```

## Quick Paths

- Docker (recommended): complete, reproducible environment
- Native (without Docker): fastest iteration if you already have PHP/Node installed

## Current Features & Tech Stack

**Backend (Laravel 11 + PHP 8.4)**
- **Pet Management**: Complete CRUD for pets with photo management and status tracking
- **Health Features**: Medical notes, vaccination records with reminders, microchip tracking, weight history
- **Placement System**: Placement requests, transfer workflows, foster assignments with handover management
- **Notifications**: Email notifications with templates, delivery tracking, and unsubscribe system
- **Admin Panel**: Filament-based admin with pet types, user management, and capability toggles
- **Auth & Permissions**: Sanctum API auth with Spatie permission-based RBAC
- **API**: Full OpenAPI documentation with Swagger UI
- **Testing**: Comprehensive PHPUnit/Pest test suite with feature and unit tests

**Frontend (React 18 + TypeScript + Vite)**
- **Pet Profiles**: Detailed pet profile pages with health sections and photo management
- **Health Management**: Interactive forms for medical notes, vaccinations, microchips, and weight tracking
- **Request Management**: Placement request creation and response workflows
- **User Management**: Registration, login, profile management, and helper profiles
- **Notifications**: Real-time notification system with preferences
- **Admin Features**: Capability gating based on pet type permissions
- **Testing**: Vitest + React Testing Library with MSW for API mocking
- **UI**: shadcn/ui components with Tailwind CSS for responsive design

**Development Experience**
- **Docker**: Complete containerized development environment
- **Hot Reload**: Vite dev server for instant frontend updates
- **Code Quality**: Pint (PHP), ESLint + TypeScript for linting
- **Testing**: 238+ frontend tests, comprehensive backend coverage
- **API Documentation**: Auto-generated OpenAPI specs with examples

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
- Admin Panel: http://localhost:8000/admin
  - Email: admin@catarchy.space
  - Password: password
  - Features: Pet management, pet types with capability toggles, user management, email configurations, notification logs
- API Documentation: http://localhost:8000/api/documentation (Swagger UI)

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
 - Database: Prefer Postgres. SQLite is no longer recommended after schema squashing.

1) Backend
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate

## Option A: Use Dockerized Postgres with native PHP (recommended)
## Start the dev PostgreSQL container:
cd ../utils/dev-pgsql-docker
docker compose up -d

## Then run migrations/seeds using the pgsql config in .env
cd ../../backend
php artisan migrate:fresh --seed
php artisan shield:generate --all
php artisan storage:link
php artisan serve
```

SQLite note
- After we squashed migrations into `database/schema/pgsql-schema.sql`, we no longer maintain a separate SQLite schema. Native SQLite will fail (missing tables) unless you provide a compatible `database/schema/sqlite-schema.sql`. Use Postgres for native development instead (see Option A above), or run the backend in Docker.

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

# Run specific test suites
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit

# Run specific test classes
php artisan test tests/Feature/PetControllerTest.php
php artisan test tests/Feature/WeightHistoryFeatureTest.php
php artisan test tests/Feature/PetMicrochipsFeatureTest.php

# Run with coverage (if configured)
php artisan test --coverage
```

Frontend (Vitest + React Testing Library)
```bash
cd frontend
npm test                    # Run all tests
npm run test:ui            # Open Vitest UI
npm run test:coverage      # Generate coverage report

# Run specific test patterns
npm test -- MicrochipsSection
npm test -- --reporter=verbose
```

**Current Test Coverage:**
- **Frontend**: 238+ tests covering components, hooks, pages, and API integration
- **Backend**: Comprehensive feature and unit tests covering:
  - Pet management and health features (medical notes, vaccinations, microchips, weights)
  - User authentication and permissions
  - Placement and transfer workflows
  - Email notifications and templates
  - Admin panel functionality

**Key Test Areas:**
- **Feature tests**: API endpoints, resource management, RBAC permissions
- **Unit tests**: Model relationships, validation rules, business logic
- **Integration tests**: Admin panel workflows, email system, notification delivery
- **Component tests**: React components with MSW API mocking
- **E2E workflows**: User registration, pet creation, placement requests

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
- Frequently sync with `dev` (our integration branch) to prevent large, painful conflicts
- Prefer small PRs; they are easier to review and merge

Branch Strategy
- `main`: Production-ready code, protected branch
- `dev`: Integration branch for features, should be merged to main regularly
- `feature/*`: Short-lived branches for individual features/fixes
- Work flow: feature → dev → main

**Complex Merge Resolution Strategy**

When dealing with large conflicts (especially during dev→main merges):

1. **Create a dedicated merge resolution branch**
   ```bash
   git checkout -b chore/merge-main-into-dev-$(date +%Y-%m-%d)
   git merge origin/main  # or the branch you're merging
   ```

2. **Systematic conflict resolution approach:**
   - Use `git status --porcelain` to get a clean list of conflicted files
   - **Add/Add conflicts**: Usually take the dev version (has new features)
   - **Content conflicts**: Manually merge, keeping both sides where appropriate  
   - **Generated files** (api-docs.json): Take dev version, regenerate later
   - **Rename/Delete conflicts**: Remove deleted files, keep renamed ones

3. **Common conflict patterns:**
   - Routes files: Merge both old and new routes
   - Model files: Combine relationships and methods
   - Factory files: Take the version with more data/features
   - Migration files: Usually no conflicts, but check dates
   - Frontend components: Merge prop changes and new functionality

4. **Post-resolution validation:**
   ```bash
   # Test that everything works
   docker compose exec backend php artisan test
   cd frontend && npm test
   
   # Regenerate docs if needed  
   docker compose exec backend php artisan l5-swagger:generate
   ```

5. **Complete the merge:**
   ```bash
   git add -A
   git commit -m "resolve: systematic merge conflict resolution"
   git push origin chore/merge-main-into-dev-$(date +%Y-%m-%d)
   
   # Create PR or merge directly if confident
   git checkout dev
   git merge chore/merge-main-into-dev-$(date +%Y-%m-%d)
   git push origin dev
   
   # Clean up
   git branch -D chore/merge-main-into-dev-$(date +%Y-%m-%d)
   git push origin --delete chore/merge-main-into-dev-$(date +%Y-%m-%d)
   ```

Merge vs Rebase
- Merge keeps the exact history and is simpler for beginners
	- `git checkout feature/x && git fetch origin && git merge origin/main`
- Rebase rewrites your branch on top of main for a linear history
	- `git checkout feature/x && git fetch origin && git rebase origin/main`
	- If conflicts: resolve, `git add .`, then `git rebase --continue`

Before opening a PR
- Re-sync: `git fetch origin && git merge origin/main` (or rebase)
- Run tests: backend and frontend must be green
- Format code: `./vendor/bin/pint` for backend; `npm run lint && npm run typecheck` for frontend
- Ensure docs are accurate (e.g., endpoints, commands, environment notes)

Conflict prevention (quick routine)
```bash
git checkout dev            # or your feature branch
git fetch origin
git merge origin/dev        # Keep up to date with integration branch
# resolve tiny conflicts now, not later
git push
```

Tip: To see what changed in main that you don’t have yet
```bash
git fetch origin
git log dev..origin/dev --oneline
```

**GitHub CLI Workflow (Recommended)**

Install GitHub CLI for streamlined PR management:
```bash
# Create PR from feature to dev
gh pr create --base dev --head feature/your-change --title "feat: add new feature" --body "Description of changes"

# View PR status and details
gh pr status
gh pr view --web

# Check for merge conflicts before merging
gh pr view <number>

# Merge PR (after approval and tests pass)
gh pr merge <number> --merge  # or --squash or --rebase

# Close/reopen PRs as needed
gh pr close <number>
gh pr reopen <number>
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