# Deployment Guide (All Environments)

This is the authoritative guide for deploying Meo Mai Moi in development, staging, and production.

There are now two deployment entrypoints:

- Manual/operator deploys use:

```bash
./utils/deploy.sh [--seed] [--fresh] [--no-cache] [--skip-build] [--no-interactive] [--quiet] [--auto-backup] [--restore]
```

- CI-driven development deploys use:

```bash
./utils/deploy-ci-dev.sh
```

See `./utils/deploy.sh --help` for the full manual/operator options.

## Prerequisites

- Docker and Docker Compose installed
- Git installed and configured on the server
- Production: HTTPS terminated at your reverse proxy (nginx/caddy/traefik/Cloudflare)
- No host-level Bun installation is required for docs builds

## Environment configuration

The deploy script uses a **dual-file approach**:

- **Root `.env`**: Docker Compose variables (build args like `VAPID_PUBLIC_KEY`, database credentials for the container)
- **`backend/.env`**: Laravel runtime configuration (APP_KEY, mail settings, etc.)

If these files don't exist, the deploy script will create them interactively (or non‑interactively with defaults when `--no-interactive` is used).

**Root `.env` important variables:**

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (for push notifications - generate with `bun x web-push generate-vapid-keys`)
- Optional Umami analytics for the frontend SPA:
  - `VITE_UMAMI_URL`
  - `VITE_UMAMI_WEBSITE_ID`
  - `VITE_UMAMI_DOMAINS` (comma-separated allowlist, optional)
  - `VITE_UMAMI_DEBUG`, `VITE_UMAMI_LAZY_LOAD` (optional flags)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (must match `backend/.env` DB\_\* values)
- Optional host port bindings for shared servers:
  - `BACKEND_HOST_BIND`, `BACKEND_HOST_PORT`
  - `REVERB_HOST_BIND`, `REVERB_HOST_PORT`
  - `DB_HOST_BIND`, `DB_HOST_PORT`
  - `HTTPS_HTTP_HOST_BIND`, `HTTPS_HTTP_HOST_PORT`
  - `HTTPS_HTTPS_HOST_BIND`, `HTTPS_HTTPS_HOST_PORT`
- **Optional**: `DEPLOY_NOTIFY_ENABLED=true`, `TELEGRAM_BOT_TOKEN`, `CHAT_ID` for deployment and monitoring notifications
- Optional: `DOCS_STRICT_LINKS` controls whether docs dead links fail builds in development (`false` by default in development, `true` by default in staging/production)

Umami note: these `VITE_UMAMI_*` values are build-time inputs for the frontend bundle. After changing them, rebuild/redeploy the backend image so the SPA assets are regenerated with the new analytics configuration.

**`backend/.env` important variables:**

- `APP_ENV` (development|staging|production)
- `APP_URL` (e.g., https://example.com or https://localhost)
- `DB_*` (DB host, name, user, password - must match root `.env` POSTGRES\_\* values)
- Optional: `DEPLOY_HOST_PORT` to override the host port used by deployment verification. If omitted, deploy verification follows `BACKEND_HOST_PORT` from the root `.env`, then falls back to `8000`.

## Documentation build contract

- Docs are built in a disposable Bun Docker container (`oven/bun:1`) during deploy.
- The backend serves docs by bind-mounting `docs/.vitepress/dist` to `/var/www/public/docs`.
- Deploy validates docs artifacts before starting containers.
  - In `staging` and `production`, deployment fails if `docs/.vitepress/dist/index.html` is missing.
  - In `production`, deployment also fails if the docs mount source is empty.
- Dead-link policy:
  - `production` and `staging`: strict by default (`DOCS_STRICT_LINKS=true` behavior).
  - `development`: non-strict by default (`DOCS_STRICT_LINKS=false`), so deploy can continue with existing docs artifact if the docs rebuild fails.

## Deployments

### Development

```bash
./utils/deploy.sh          # migrate only, preserves data
./utils/deploy.sh --seed   # migrate + seed sample data
./utils/deploy.sh --auto-backup  # create backup before deploying
./utils/deploy.sh --skip-build  # skip Docker image builds (uses existing images)
```

For CI-driven development deployment on the server, use:

```bash
./utils/deploy-ci-dev.sh
```

`deploy-ci-dev.sh` is a thin wrapper around `deploy.sh` that forces non-interactive CI-safe behavior and intentionally skips the old self-updating git sync flow. In CI, the pipeline decides which commit is being deployed; the server-side script only performs the deployment safely.

For `catarchy2`, the recommended root `.env` values are:

```bash
BACKEND_HOST_BIND=127.0.0.1
BACKEND_HOST_PORT=8001
REVERB_HOST_BIND=127.0.0.1
REVERB_HOST_PORT=8081
DB_HOST_BIND=127.0.0.1
DB_HOST_PORT=5433
```

And in `backend/.env`:

```bash
APP_URL=https://dev.meo-mai-moi.com
ENABLE_HTTPS=false
```

This keeps Docker ports private to the host and lets host NGINX on `catarchy2` own public `80/443`.

**Note**: Use `--skip-build` for faster deployments when you have already built the Docker images and just need to restart containers or run migrations.

**Memory Optimization**: In development environments (`APP_ENV=development`), containers are stopped before building Docker images to reduce peak memory usage and prevent out-of-memory failures on resource-constrained systems. Production and staging environments build images while services are still running to minimize downtime.

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
./utils/deploy.sh --no-interactive --quiet --auto-backup
```

Notes:

- The backend container serves HTTP on port 80. In production, terminate HTTPS at your reverse proxy and forward to port 8000 on the host.
- Migrations run via the deploy script only (the container’s entrypoint has `RUN_MIGRATIONS=false` to avoid race conditions).
- The `--auto-backup` flag automatically creates a backup before deployment for safety.
- For production environments, consider setting up automated daily backups using the backup scheduler.
- Deploy fails fast if docs artifacts are missing/invalid for staging and production.

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

- CI-driven development deployment should SSH into the server and run:

```bash
./utils/deploy-ci-dev.sh
```

This is the preferred path for Woodpecker-based `dev` deployments because it skips the legacy git self-update/sync behavior from `deploy.sh`.

- Manual or legacy automation can still SSH into the server and run:

```bash
DEPLOY_FORCE_RESET=true ./utils/deploy.sh --no-interactive --quiet
```

This remains useful for operator-driven deploys and older webhook-style flows where the target host is responsible for syncing its own checkout.

- A webhook receiver on the server (already installed in your environment), which validates the payload signature and triggers the same command above. Ensure the deploy user has the repository checked out with proper permissions.

### Woodpecker `dev` pipeline on `catarchy2`

The repository now includes a starter [`.woodpecker.yml`](../.woodpecker.yml) for `dev` deployments.

Current intended flow:

1. A push to `dev` triggers Woodpecker.
2. Woodpecker SSHes into `catarchy2`.
3. On the server, the long-lived checkout at `DEV_DEPLOY_PATH` is reset to the pushed commit.
4. The server runs `./utils/deploy-ci-dev.sh`.

Current dev checkout and ports on `catarchy2`:

- checkout path: `/opt/meo-mai-moi-dev`
- backend: `127.0.0.1:8001`
- reverb: `127.0.0.1:8081`
- postgres: `127.0.0.1:5433`

Woodpecker secrets are intentionally split by scope:

- shared/global admin secrets:
  - `CATARCHY2_HOST`
  - `CATARCHY2_USER`
  - `CATARCHY2_SSH_KEY`
- repo-local secrets for `meo-mai-moi`:
  - `DEV_DEPLOY_PATH`

Recommended values:

- `CATARCHY2_HOST=10.23.0.1` - SSH host for `catarchy2` over WireGuard
- `CATARCHY2_USER=ubuntu` - SSH user on `catarchy2`
- `CATARCHY2_SSH_KEY` - base64-encoded private deploy key
- `DEV_DEPLOY_PATH=/opt/meo-mai-moi-dev` - absolute path to the dev checkout on `catarchy2`

Why `CATARCHY2_HOST` is not `127.0.0.1`:

- Woodpecker steps run inside containers.
- Inside a CI container, `127.0.0.1` means the container itself, not the VPS host.
- Use the host's real reachable address instead. In this setup, the preferred address is the WireGuard IP `10.23.0.1`.

The pipeline intentionally deploys via SSH into a host checkout instead of using host-path volumes inside Woodpecker steps. That keeps the repo compatible with non-trusted Woodpecker project settings and matches the existing deployment scripts more naturally.

### Reading CI-safe deploy logs

For the current `catarchy2` dev setup, these log lines are expected informational skips, not deployment problems:

- `Skipping git repository sync (--skip-git-sync flag set)`
- `Bun not installed on host, skipping API generation check`
- `Bun not installed on host, skipping i18n check`
- `php not found on host; skipping OpenAPI spec generation`

They appear because `deploy-ci-dev.sh` intentionally skips host-side git sync, and the actual build happens inside Docker rather than relying on host-installed Bun or PHP.

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

## 🔑 Seeder Overrides

Configure the initial Super Admin credentials via environment variables in `backend/.env*`:

```
SEED_ADMIN_EMAIL=admin@catarchy.space
SEED_ADMIN_PASSWORD=password
# Optional: SEED_ADMIN_NAME="Super Admin"
```

`DatabaseSeeder` and `deploy.sh` will honor these values when seeding and when checking for the admin user during deployments.

Demo account seeding is also configurable:

```bash
DEMO_USER_EMAIL=demo@catarchy.space
DEMO_USER_NAME="Demo Caregiver"
DEMO_USER_PASSWORD=password
DEMO_LOGIN_TOKEN_TTL_SECONDS=120
# Optional: DEMO_LOGIN_REDIRECT_PATH=/
```

When `DatabaseSeeder` runs in non-production environments, it now ensures this demo user exists and seeds a curated set of pets, health records, foster relationships, microchip data, and in-app notifications for the public demo flow.

## 🌱 Safe Production Seeders

When deploying to production, you may need to update basic reference data (categories, cities, pet types, etc.) without creating test users or pets. The following seeders are safe to run on production as they only populate essential reference data:

### Safe Seeders to Run on Production

```bash
# Core reference data
docker compose exec backend php artisan db:seed --class=CitySeeder
docker compose exec backend php artisan db:seed --class=PetTypeSeeder
docker compose exec backend php artisan db:seed --class=CategorySeeder

# Authentication & permissions
docker compose exec backend php artisan db:seed --class=ShieldSeeder
docker compose exec backend php artisan db:seed --class=RolesAndPermissionsSeeder

# Configuration & notifications
docker compose exec backend php artisan db:seed --class=SettingsSeeder
docker compose exec backend php artisan db:seed --class=NotificationPreferenceSeeder
docker compose exec backend php artisan db:seed --class=NotificationTemplateSeeder
```

### What These Seeders Provide

- **CitySeeder**: Creates city entries for various countries (reference data only)
- **PetTypeSeeder**: Creates pet types (cat, dog, bird, etc.) with their configurations
- **CategorySeeder**: Creates pet categories/breeds and characteristics for each pet type
- **ShieldSeeder**: Sets up Laravel Shield authentication/authorization data
- **RolesAndPermissionsSeeder**: Creates roles and permissions structure
- **SettingsSeeder**: Sets basic application settings (invite-only mode, email verification)
- **NotificationPreferenceSeeder**: Creates notification preference templates
- **EmailConfigurationSeeder**: Sets up email configuration options
- **NotificationTemplateSeeder**: Creates notification templates for the system

### Important Notes

- These seeders use `updateOrCreate()` so they're safe to run multiple times without duplicating data
- They only create reference/configuration data, not test users, pets, or other entities
- **Avoid running `DatabaseSeeder`** on production as it calls multiple seeders including test data creation
- **Unsafe seeders** to avoid: `UserSeeder`, `HelperProfileSeeder`, `PlacementRequestSeeder`, `ReviewSeeder`, `E2ETestingSeeder`, `E2EEmailConfigurationSeeder`

## 💾 Backup & Restore System

The backup system supports both database and user uploads, with comprehensive safety features and automated scheduling options.

### Creating Backups

#### Manual Backups

```bash
./utils/backup.sh all                    # Create both database and uploads backup
./utils/backup.sh database               # Create only database backup
./utils/backup.sh uploads                # Create only uploads backup
./utils/backup.sh --list                 # List all available backups
./utils/backup.sh --clean                # Remove backups older than 30 days
```

#### Automated Backups

```bash
./utils/backup-scheduler.sh              # Run scheduled backup (respects schedule)
./utils/backup-scheduler.sh --run-now    # Force immediate backup
./utils/backup-scheduler.sh --dry-run    # Test backup configuration without running
```

#### Cron Job Setup

```bash
./utils/setup-backup-cron.sh --interactive    # Interactive cron setup
./utils/setup-backup-cron.sh --add-daily      # Add daily backup cron job
./utils/setup-backup-cron.sh --add-weekly     # Add weekly backup cron job
./utils/setup-backup-cron.sh --remove         # Remove backup cron jobs
```

**Backup Features:**

- **Comprehensive Coverage**: Database + user uploads in coordinated backups
- **Compressed Formats**:
  - Database: `backups/backup-YYYY-MM-DD_HH-MM-SS.sql.gz`
  - Uploads: `backups/uploads_backup-YYYY-MM-DD_HH-MM-SS.tar.gz`
- **Integrity Verification**: SHA256 checksums for all backups
- **Automatic Cleanup**: Configurable retention (default: 30 days)
- **Health Checks**: Container status and connectivity validation
- **Flexible Scheduling**: Hourly, daily, weekly, monthly options
- **Smart Scheduling**: Only runs when needed based on last backup time

### Restoring from Backups

#### Individual Component Restoration

```bash
./utils/backup.sh --restore-database backups/backup-2026-01-22_14-51-10.sql.gz
./utils/backup.sh --restore-uploads backups/uploads_backup-2026-01-22_14-51-10.tar.gz
```

#### Coordinated Restoration (Recommended)

```bash
./utils/backup.sh --restore-all 2026-01-22_14-51-10    # Restore both by timestamp
```

#### During Deployment (Automated)

```bash
./utils/deploy.sh --auto-backup         # Create backup before deploying
./utils/deploy.sh --restore-db          # Restore database before deploying
./utils/deploy.sh --restore-uploads     # Restore uploads before deploying
./utils/deploy.sh --restore             # Restore both database and uploads
```

When using `--no-interactive` together with restore flags, you must provide the restore target explicitly:

```bash
# Restore both (timestamp)
DEPLOY_RESTORE_TIMESTAMP=2026-01-22_14-51-10 ./utils/deploy.sh --no-interactive --restore

# Restore DB only (file path)
DEPLOY_RESTORE_DB_FILE=backups/backup-2026-01-22_14-51-10.sql.gz ./utils/deploy.sh --no-interactive --restore-db

# Restore uploads only (file path)
DEPLOY_RESTORE_UPLOADS_FILE=backups/uploads_backup-2026-01-22_14-51-10.tar.gz ./utils/deploy.sh --no-interactive --restore-uploads
```

#### Legacy Interactive Method

```bash
./utils/restore.sh                      # Interactive menu (database, uploads, or both)
```

### Safety Features

- **Pre-restoration Validation**: Disk space, connectivity, checksum verification
- **Confirmation Prompts**: Prevent accidental data loss with clear warnings
- **Post-restoration Verification**: Database connectivity and file count validation
- **Detailed Logging**: All operations logged with timestamps and error details
- **Non-destructive Testing**: Dry-run modes for backup scheduler

### Rollback vs Restore

- **Rollback** (`rollback.sh`): Revert code changes to a previous deployment snapshot while preserving database data
- **Restore**: Replace current data with data from a backup file (destructive operation)

Use rollback for code issues, use restore for data recovery.

### Configuration Options

#### Environment Variables for Backup Scheduler

```bash
BACKUP_SCHEDULE=daily          # hourly, daily, weekly, monthly
BACKUP_RETENTION_DAYS=30       # Days to keep backups
BACKUP_TYPE=all               # all, database, uploads
BACKUP_NOTIFICATION=true      # Enable Telegram notifications
LOG_FILE=/path/to/logfile     # Custom log file path
```

#### Environment Variables for Manual Backups

```bash
BACKUP_RETENTION_DAYS=7       # Override default retention
DB_USERNAME=user              # Database username
DB_DATABASE=meo_mai_moi       # Database name
```

### Utility Scripts

- **backup.sh** - Comprehensive backup creation and restoration utility
- **backup-scheduler.sh** - Automated backup scheduler with health checks
- **setup-backup-cron.sh** - Cron job setup and management
- **restore.sh** - Legacy interactive restore utility (still supported)
- **rollback.sh** - Code rollback utility (preserves data)

### Production Recommendations

1. **Enable Automated Backups**: Set up daily or weekly cron jobs for production
2. **Use Coordinated Backups**: Always backup both database and uploads together
3. **Test Restore Procedures**: Regularly test restoration in staging environments
4. **Monitor Backup Health**: Check logs and backup file integrity
5. **Configure Notifications**: Enable Telegram alerts for backup failures
6. **Plan Retention Policy**: Balance storage costs with recovery needs
7. **Secure Backup Storage**: Consider off-site backup storage for critical data

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
