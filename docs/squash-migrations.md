# Squashing Laravel Migrations (PostgreSQL)

Squash all migrations into a single schema file for faster CI, cleaner history, and fewer moving parts.

## Quick Reference

```bash
# 1. Dump schema and prune migrations (inside container)
docker compose exec backend php artisan schema:dump --prune

# 2. Copy schema file to your local filesystem (required!)
docker compose cp backend:/var/www/database/schema/pgsql-schema.sql backend/database/schema/pgsql-schema.sql

# 3. Commit
git add backend/database/schema/pgsql-schema.sql
git rm backend/database/migrations/*.php
git commit -m "chore(db): squash migrations via schema:dump --prune"
```

## Why Squash?

- **Faster** CI and deployments (no migration replay)
- **Lower risk** (fewer moving parts during boot)
- **Cleaner** Git history with canonical schema file

## Prerequisites

- Stack is healthy: `docker compose ps` shows backend/db healthy
- DB can migrate cleanly from scratch
- Backup exists or you're okay losing dev data

## Detailed Steps

### 1. (Optional) Start Fresh

```bash
docker compose down
docker volume rm meo-mai-moi_pgdata
docker compose up -d
```

### 2. Generate Schema

```bash
docker compose exec backend php artisan schema:dump --prune
```

This creates `backend/database/schema/pgsql-schema.sql` inside the container.

### 3. Copy to Host

Since `./backend` is **not** bind-mounted, the schema file only exists inside the container. Copy it out:

```bash
docker compose cp backend:/var/www/database/schema/pgsql-schema.sql backend/database/schema/pgsql-schema.sql
```

**Alternative** (bind-mount approach—changes land directly in working tree):

```bash
docker compose run --rm -v ./backend:/var/www backend php artisan schema:dump --prune
```

### 4. Verify & Commit

```bash
ls -l backend/database/schema/pgsql-schema.sql
head -n 20 backend/database/schema/pgsql-schema.sql

git add backend/database/schema/pgsql-schema.sql
git rm backend/database/migrations/*.php
git commit -m "chore(db): squash migrations via schema:dump --prune (pgsql)"
```

Keep only **new** migrations created after the dump.

## Rollback

```bash
git restore backend/database/schema/ backend/database/migrations/
docker volume rm meo-mai-moi_pgdata
docker compose up -d
docker compose exec backend php artisan migrate
```
