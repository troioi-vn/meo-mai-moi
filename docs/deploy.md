# Deployment Guide (All Environments)

This is the authoritative guide for deploying Meo Mai Moi in development, staging, and production.

The single entrypoint for all deployments is:

```bash
./utils/deploy.sh [--seed] [--fresh] [--no-cache] [--no-interactive] [--quiet]
```

See `./utils/deploy.sh --help` for full options.

## Prerequisites

- Docker and Docker Compose installed
- Git installed and configured on the server
- Production: HTTPS terminated at your reverse proxy (nginx/caddy/traefik/Cloudflare)

## Environment configuration

The deploy script uses `backend/.env.docker`. If it doesn’t exist, the script will create it interactively (or non‑interactively with defaults when `--no-interactive` is used).

Important variables:

- `APP_ENV` (development|staging|production)
- `APP_URL` (e.g., https://example.com or https://localhost)
- `DB_*` (DB host, name, user, password)
- Optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` for deploy notifications
- Optional: `DEPLOY_HOST_PORT` to override the default host port (8000) used by deployment verification

## Deployments

### Development

```bash
./utils/deploy.sh          # migrate only, preserves data
./utils/deploy.sh --seed   # migrate + seed sample data
```

HTTPS in development is handled by the `https-proxy` service (compose profile `https`).

To enable HTTPS locally:

1. Set in `backend/.env.docker`:

```
APP_ENV=development
ENABLE_HTTPS=true
```

2. Generate self‑signed certificates (one time):

```bash
./utils/generate-dev-certs.sh
```

3. Deploy:

```bash
./utils/deploy.sh
```

Access:

- App: http://localhost:8000 or https://localhost
- Admin: http(s)://localhost/admin
- Docs: http(s)://localhost/docs

### Staging / Production

Use the same command on the server:

```bash
./utils/deploy.sh --no-interactive --quiet
```

Notes:

- The backend container serves HTTP on port 80. In production, terminate HTTPS at your reverse proxy and forward to port 8000 on the host.
- Migrations run via the deploy script only (the container’s entrypoint has `RUN_MIGRATIONS=false` to avoid race conditions).
- Consider running `./utils/backup.sh` before deployments to production.

## Branch strategy

Deployment target branch is determined by environment and can be customized:

1. Defaults:

- production → `main`
- staging → `staging`
- development → `dev`

2. Project‑level overrides: create a `.deploy-config` file in the repo root or base on the example:

```
# .deploy-config.example
DEPLOY_BRANCH_PRODUCTION=main
DEPLOY_BRANCH_STAGING=staging
DEPLOY_BRANCH_DEVELOPMENT=dev
```

3. One‑off override: set `DEPLOY_BRANCH_OVERRIDE` env var when invoking the script.

## Webhook / CI automation

Two common ways to automate deployments:

- GitHub Actions (or any CI) SSH into the server and run:

```bash
DEPLOY_FORCE_RESET=true ./utils/deploy.sh --no-interactive --quiet
```

You may pass `DEPLOY_BRANCH_OVERRIDE` from the CI workflow branch if needed.

- A webhook receiver on the server (already installed in your environment), which validates the payload signature and triggers the same command above. Ensure the deploy user has the repository checked out with proper permissions.

## Logs and retention

- Per‑run logs are written to `.deploy/deploy-YYYYMMDD-HHMMSS.log` and `.deploy/deploy-YYYYMMDD-HHMMSS.json`.
- Convenience symlinks: `.deploy.log` and `.deploy.log.json` point to the latest run.
- Logs older than 30 days are cleaned up automatically.

## Backups

Create a database backup:

```bash
./utils/backup.sh
```

This produces gzip‑compressed files like `backups/backup-YYYY-MM-DD_HH-MM-SS.sql.gz`.

Restore interactively:

```bash
./utils/restore.sh
```

The restore tool supports both the new `.sql.gz` files and legacy `db_backup_*.sql`.

## Production HTTPS

Terminate HTTPS at your reverse proxy (nginx/caddy/traefik/Cloudflare) and forward to the backend’s HTTP port.

Set headers:

- `X-Forwarded-Proto`
- `X-Forwarded-For`
- `X-Forwarded-Host`

Do not use self‑signed certificates in production.

## Migration strategy

- Migrations are run explicitly by the deploy script after the container is healthy.
- This prevents startup races and ensures orderly seeding and verification.
