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

The deploy script uses a **dual-file approach**:

- **Root `.env`**: Docker Compose variables (build args like `VAPID_PUBLIC_KEY`, database credentials for the container)
- **`backend/.env`**: Laravel runtime configuration (APP_KEY, mail settings, etc.)

If these files don't exist, the deploy script will create them interactively (or non‑interactively with defaults when `--no-interactive` is used).

**Root `.env` important variables:**

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (for push notifications - generate with `npx web-push generate-vapid-keys`)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (must match `backend/.env` DB\_\* values)
- **Optional**: `DEPLOY_NOTIFY_ENABLED=true`, `TELEGRAM_BOT_TOKEN`, `CHAT_ID` for deployment and monitoring notifications

**`backend/.env` important variables:**

- `APP_ENV` (development|staging|production)
- `APP_URL` (e.g., https://example.com or https://localhost)
- `DB_*` (DB host, name, user, password - must match root `.env` POSTGRES\_\* values)
- Optional: `DEPLOY_HOST_PORT` to override the default host port (8000) used by deployment verification

## Deployments

### Development

```bash
./utils/deploy.sh          # migrate only, preserves data
./utils/deploy.sh --seed   # migrate + seed sample data
```

HTTPS in development is handled by the `https-proxy` service (compose profile `https`).

To enable HTTPS locally:

1. Set in `backend/.env`:

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
- Volume deletion events are logged to `.deploy/volume-deletions.log` for audit trail.

## Volume safety and debugging

### Database volume protection

The deploy script includes several safeguards against accidental data loss:

1. **Empty database detection**: Deployment fails if the database is empty (unless `--allow-empty-db` or `--seed` is specified)
2. **Volume fingerprinting**: Tracks the database volume creation timestamp in `.db_volume_fingerprint` to detect unexpected volume recreation
3. **Volume deletion logging**: All `--fresh` deployments log volume deletion events to `.deploy/volume-deletions.log`

### Investigating data loss

If you encounter unexpected database emptiness or data loss, use these tools:

**Check volume creation time vs fingerprint:**

```bash
docker volume inspect meo-mai-moi_pgdata --format '{{ .CreatedAt }}'
cat .db_volume_fingerprint
```

If these don't match, the volume was recreated outside of tracked deployments.

**Check volume deletion history:**

```bash
cat .deploy/volume-deletions.log
```

**Monitor volume events in real-time** (run in separate terminal):

```bash
docker events --filter 'type=volume' --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
```

**Review historical volume events:**

```bash
./utils/check-volume-events.sh [days-back]  # Check last N days (default: 7)
```

Note: Docker event logs are ephemeral and may be cleared/rotated. For persistent tracking, rely on `.deploy/volume-deletions.log`.

### Common causes of volume deletion

- Running `docker compose down -v` (the `-v` flag deletes volumes)
- Running `docker system prune -a --volumes`
- Using `./utils/deploy.sh --fresh` (intentional, but logged)
- External tools or scripts that manage Docker resources

## Telegram Notifications

The system supports Telegram notifications for:

- Deployment start/success/failure
- Database monitoring alerts (empty database, query failures)

### Setup

1. **Create a Telegram bot** (one-time):

   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` and follow instructions
   - Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Get your Chat ID**:

   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - Copy your Chat ID (numeric, e.g., `127529747`)

3. **Configure in root `.env`**:

   ```bash
   DEPLOY_NOTIFY_ENABLED=true
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   CHAT_ID=127529747
   ```

4. **Test notifications**:

   ```bash
   ./utils/deploy_notify_test.sh
   ```

5. **Rebuild backend** (required for monitoring alerts):
   ```bash
   docker compose up -d --build backend
   ```

### Database Monitoring

A continuous monitoring script runs inside the backend container, checking every 60 seconds for:

- Empty database (all data lost)
- Database query failures

Alerts are sent to Telegram with diagnostic information. Check logs:

```bash
docker compose exec backend tail -f /var/www/storage/logs/db-monitor.log
```

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
