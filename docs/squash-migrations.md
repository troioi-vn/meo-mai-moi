# Squashing Laravel Migrations (PostgreSQL)

This guide describes a safe, repeatable process to squash migrations into a single schema file while keeping your Docker environment healthy and your Git history clean.

## TL;DR
- Ensure containers are healthy and API responds.
- Run: `php artisan schema:dump --prune` (inside backend container).
- Commit `backend/database/schema/pgsql-schema.sql` and remove old migrations.

## Why squash?
- Faster CI and deployments (no need to replay every migration).
- Lower operational risk (fewer moving parts during boot).
- Cleaner history; schema is captured in one canonical file.

## Preconditions
- Stack is healthy: `docker compose ps` shows backend/db healthy.
- App can migrate cleanly from scratch on a fresh DB.
- You have a backup or you’re intentionally discarding data (in dev).

## One-time hardening (recommended)
- Ensure PostgreSQL client tools are available in the PHP image (already included via `postgresql-client`).
  - We no longer use SQLite anywhere; `sqlite3` is not required.

## Step-by-step

1) Start fresh (optional in dev)
- Recreate DB volume (destroys data):
  - `docker compose down`
  - `docker volume rm meo-mai-moi_pgdata`
  - `docker compose up -d`
- Confirm health: `docker compose ps`
- Smoke test: `curl -sf http://localhost:8000/api/version`

2) Generate schema and prune
- Exec into backend or run one-off command:
  - `docker compose exec backend php artisan schema:dump --prune`
- This will:
  - Create `backend/database/schema/pgsql-schema.sql`
  - Delete migration files from the filesystem (if not, remove them manually)

3) Verify
- `docker compose exec backend ls -l database/schema`
- Inspect the first lines: `head -n 20 backend/database/schema/pgsql-schema.sql`
- Ensure app still boots healthy.

4) Commit
- Add schema file and remove old migrations from Git:
  - `git add backend/database/schema/pgsql-schema.sql`
  - `git rm backend/database/migrations/*.php` (leave a `.gitkeep` if desired)
  - `git add backend/.env.docker` (keep it versioned for compose)
  - `git commit -m "chore(db): squash migrations via schema:dump --prune (pgsql)"`

## Rollback / Recovery
- If something breaks:
  - `git restore` any changed files
  - Restore old migrations from your branch or remote and rebuild
  - Recreate DB volume and migrate normally (`php artisan migrate`)

## Notes & Tips
- Healthcheck issues often stem from DB readiness; prefer letting Laravel handle connection errors rather than over-complicating entrypoints.
- Keep `.env.docker` in the repo so compose consistently injects env vars into backend.
- For prod: prefer running schema dumps in CI using a disposable DB and committing the resulting schema file in a PR.
