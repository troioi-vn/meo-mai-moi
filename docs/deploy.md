# Deployment Guide (All Environments)

This is the authoritative guide for deploying Meo Mai Moi in development, staging, and production.

There are now two deployment entrypoints:

- Manual/operator deploys use:

```bash
./utils/deploy.sh [--seed] [--fresh] [--no-cache] [--skip-build] [--no-interactive] [--quiet]
```

- CI-driven development deploys use:

```bash
./utils/deploy-ci-dev-ab.sh
```

- CI-driven production deploys use:

```bash
./utils/deploy-ci-prod-ab.sh
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
- Optional backend image override for registry-based deploys:
  - `BACKEND_IMAGE`
  - `BACKEND_IMAGE_PULL_POLICY`
- Optional A/B rollback-buffer TTL in minutes:
  - `AB_OLD_SLOT_TTL_MINUTES` (`30` by default; set to `0` to keep the previous slot running indefinitely)
- Optional host port bindings for shared servers:
  - `BACKEND_HOST_BIND`, `BACKEND_HOST_PORT`
  - `REVERB_HOST_BIND`, `REVERB_HOST_PORT`
  - `DB_HOST_BIND`, `DB_HOST_PORT`
  - `HTTPS_HTTP_HOST_BIND`, `HTTPS_HTTP_HOST_PORT`
  - `HTTPS_HTTPS_HOST_BIND`, `HTTPS_HTTPS_HOST_PORT`
- Telegram user-bot runtime config lives in `backend/.env`, not root `.env`: `TELEGRAM_USER_BOT_TOKEN`, `TELEGRAM_USER_BOT_USERNAME`, `TELEGRAM_USER_BOT_WEBHOOK_SECRET_TOKEN`
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
./utils/deploy.sh --skip-build  # skip Docker image builds (uses existing images)
```

For CI-driven A/B deployment on the server, use the environment-specific entrypoint:

```bash
./utils/deploy-ci-dev-ab.sh
./utils/deploy-ci-prod-ab.sh
```

These scripts deploy into the inactive slot, verify that slot, then switch the reverse proxy only after the new slot is healthy. They intentionally skip the old self-updating git sync flow because CI already decides which commit is being deployed.

Typical Woodpecker flow:

1. decode the environment-specific build env secret into build-time frontend variables
2. build and push an immutable backend image for the commit
3. SSH to the target host and reset the long-lived checkout to the exact pushed commit
4. run the matching A/B deploy script with:
   - `BACKEND_IMAGE=<registry>/<image>:<commit-sha>`
   - `BACKEND_IMAGE_PULL_POLICY=always`
   - `DEPLOY_USE_PREBUILT_IMAGE=true`
5. build docs on-host, pull the immutable backend image, verify the inactive slot, then switch the reverse proxy
6. send deployment notifications, if configured:
   - deploy started
   - A/B switch completed
   - deploy finished or failed

The build env secret is expected to provide shell-style `KEY=value` lines for Docker build-time frontend inputs. The Woodpecker pipeline accepts either:

- base64-encoded env-file content
- raw escaped env-file content

Recommended decoded content:

```bash
VAPID_PUBLIC_KEY=...
VITE_REVERB_APP_KEY=...
VITE_REVERB_HOST=...
VITE_REVERB_PORT=...
VITE_REVERB_SCHEME=...
VITE_UMAMI_URL=...
VITE_UMAMI_WEBSITE_ID=...
VITE_UMAMI_DOMAINS=...
VITE_UMAMI_DEBUG=false
VITE_UMAMI_LAZY_LOAD=false
```

For a shared-host A/B deployment, root `.env` usually includes:

```bash
BACKEND_HOST_BIND=127.0.0.1
BACKEND_HOST_PORT=<legacy-or-single-slot-port>
REVERB_HOST_BIND=127.0.0.1
REVERB_HOST_PORT=<legacy-or-single-slot-reverb-port>
SLOT_A_BACKEND_HOST_BIND=127.0.0.1
SLOT_A_BACKEND_HOST_PORT=<slot-a-backend-port>
SLOT_A_REVERB_HOST_BIND=127.0.0.1
SLOT_A_REVERB_HOST_PORT=<slot-a-reverb-port>
SLOT_B_BACKEND_HOST_BIND=127.0.0.1
SLOT_B_BACKEND_HOST_PORT=<slot-b-backend-port>
SLOT_B_REVERB_HOST_BIND=127.0.0.1
SLOT_B_REVERB_HOST_PORT=<slot-b-reverb-port>
AB_OLD_SLOT_TTL_MINUTES=30
DB_HOST_BIND=127.0.0.1
DB_HOST_PORT=<optional-local-db-port>
DB_SERVICE_MODE=external
DB_EXTERNAL_CONTAINER=<external-postgres-container>
SHARED_SERVICES_NETWORK_EXTERNAL=true
SHARED_SERVICES_NETWORK_NAME=<shared-docker-network>
```

And in `backend/.env`:

```bash
APP_ENV=production
APP_URL=https://example.com
ENABLE_HTTPS=false
DB_HOST=<postgres-host>
DB_PORT=5432
DB_DATABASE=<database-name>
DB_USERNAME=<database-user>
DB_PASSWORD=replace-me
```

This keeps Docker ports private to the host, lets the host reverse proxy own public `80/443`, and retires the previously active slot after a short rollback window by default.

In this mode, the backend joins an external Docker network and uses a shared PostgreSQL service instead of starting its own long-lived local `db` service.

Operational note:

- after the first successful slot rollout, the legacy single-backend `backend` service should no longer stay running
- `deploy-ci-dev-ab.sh` now stops that legacy service automatically whenever an active A/B slot already exists, and again after a successful switch
- this prevents the old container from holding slot ports

### Production A/B slots

Production now uses the same slot-based rollout shape as development, but with a dedicated production slot helper:

```bash
./utils/deploy-ci-prod-ab.sh
```

Production uses the same slot environment variables shown above, usually with a shorter rollback-buffer TTL than development.

The active production slot is tracked in a marker file:

```bash
<deploy-path>/.deploy-active-slot-prod
```

The production A/B flow is:

1. determine the inactive slot
2. pull and start only that target slot
3. verify that target slot on its host-bound port
4. rewrite the reverse proxy vhost from the configured template
5. validate and reload the reverse proxy, then mark the new slot active
6. stop the legacy single-backend service after the first successful slot rollout

Operational note:

- `backend_a` and `backend_b` both run the same `supervisord` programs, including Laravel's scheduler.
- During A/B rollouts, both slots may be alive at the same time for a while, so scheduled commands must be safe to run more than once.
- Prefer idempotent scheduled jobs or move scheduling to a single dedicated runtime if a task cannot tolerate duplicate execution.

- after the switch, the previously active slot is intentionally kept alive for `AB_OLD_SLOT_TTL_MINUTES` minutes (`30` by default)
- this is the rollback buffer for production; if the new slot misbehaves after cutover, switch NGINX back before the TTL expires instead of waiting for a rebuild
- expect both `backend_a` and `backend_b` to be alive briefly after a successful production rollout
- the tradeoff is temporary extra memory usage, rather than indefinite dual-slot steady state
- only the inactive target slot is stopped before rebuild; the old active slot is not treated as stale cleanup

Important reverse-proxy note:

- the host reverse-proxy vhost must be a pure reverse proxy to the active slot
- do not keep host-side document-root or `try_files` rules in the public app vhost
- otherwise the host can serve `public/index.php` as a static file instead of forwarding to PHP-FPM inside the active backend container
- slot activation should always validate the proxy config before reload

### Development A/B slots

A development deployment can use two backend slots on the same host:

- slot `a` -> `backend_a` on configured slot A ports
- slot `b` -> `backend_b` on configured slot B ports

The active slot is tracked in:

```bash
<deploy-path>/.deploy-active-slot
```

Useful operational commands:

```bash
cd <deploy-path>
./utils/dev-slot.sh status
./utils/dev-slot.sh active
./utils/dev-slot.sh inactive
```

The A/B deploy flow is:

1. determine the inactive slot
2. build or pull and start only that target slot
3. run migrations and application checks against the target slot
4. rewrite the reverse-proxy vhost from the configured template
5. validate and reload the reverse proxy, then mark the new slot active

This keeps the previous slot available as a rollback target for a short period and avoids the old blanket `docker compose stop` behavior during development slot deploys.

## Registry-backed CI/CD

`meo-mai-moi` supports two deployment shapes:

- manual/operator deploys: local source checkout plus local Docker build
- Woodpecker CI deploys: CI builds and pushes a registry image, target host only pulls

The Compose file keeps both `build:` and `image:` on the backend services. The active mode is selected by environment:

- default/manual: no override, so Compose uses `meomaimoi/backend:local`
- CI pull-only deploys: export `BACKEND_IMAGE` to a registry tag and `DEPLOY_USE_PREBUILT_IMAGE=true`

When `DEPLOY_USE_PREBUILT_IMAGE=true`, `deploy.sh` still builds docs on the host, but skips the on-host Docker image build and runs `docker compose pull` followed by `docker compose up -d --no-build`.

**Note**: Use `--skip-build` for faster deployments when you have already built the Docker images and just need to restart containers or run migrations.

**Memory Optimization**: In development environments (`APP_ENV=development`), the legacy single-slot deploy stops containers before build to reduce peak memory usage. In A/B mode, the deploy keeps the active slot running and only stops the inactive target service if needed. Production and staging environments build images while services are still running to minimize downtime.

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

- The backend container serves HTTP on port 80. In production A/B mode, terminate HTTPS at your reverse proxy and forward to the active slot host port (`8011` or `8012`) via the generated NGINX vhost.
- CI-based production rollout prefers the A/B entrypoint above, which verifies the inactive slot before the public switch.
- Migrations run via the deploy script only (the container’s entrypoint has `RUN_MIGRATIONS=false` to avoid race conditions).
- Backups are managed outside this repository by shared infrastructure; deploy scripts no longer create repo-managed backups.
- Deploy fails fast if docs artifacts are missing/invalid for staging and production.
- In external PostgreSQL mode, backup and restore helpers must use client tools compatible with the shared server version; prefer the shared DB container over the app container for `pg_dump`/`psql`.

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
./utils/deploy-ci-dev-ab.sh
```

This is the preferred path for Woodpecker-based `dev` deployments because it performs slot-aware A/B rollout. Woodpecker decides the commit; the server-side script only deploys the already-checked-out code.

- Manual or legacy automation can still SSH into the server and run:

```bash
./utils/deploy.sh --no-interactive --quiet
```

This remains useful for operator-driven deploys and older webhook-style flows where something else has already updated the checkout on the target host.

- A webhook receiver on the server, which validates the payload signature and triggers the same command above. Ensure the deploy user has the repository checked out with proper permissions.

### Woodpecker pipelines

The repository includes [`.woodpecker.yml`](../.woodpecker.yml) as one CI/CD implementation. Hostnames, SSH users, registry addresses, deployment paths, and secret values are operator-owned configuration and should be managed outside the public repository.

A typical development pipeline:

1. A push to the deployment branch triggers Woodpecker.
2. Woodpecker builds and pushes an immutable image.
3. Woodpecker SSHes into the target host.
4. On the server, the long-lived checkout at the configured deploy path is reset to the pushed commit.
5. The server logs into the registry and runs `./utils/deploy-ci-dev-ab.sh` against the pushed image.
6. After the slot switch, Woodpecker sends deploy notifications, if configured.

Woodpecker secrets are intentionally split by scope:

- shared/global or organization secrets:
  - `<TARGET>_HOST`
  - `<TARGET>_USER`
  - `<TARGET>_SSH_KEY`
  - `REGISTRY_AUTH_USERNAME`
  - `REGISTRY_AUTH_PASSWORD`
- repo-local secrets for `meo-mai-moi`:
  - environment-specific deploy path
  - environment-specific Docker build env

The pipeline currently tolerates two secret formats for build env content:

- base64-encoded env-file content
- raw escaped env-file content copied from a shell-style `.env`

Why the target host is usually not `127.0.0.1`:

- Woodpecker steps run inside containers.
- Inside a CI container, `127.0.0.1` means the container itself, not the deployment host.
- Use the target host's real reachable address instead.

The pipeline intentionally deploys via SSH into a host checkout instead of using host-path volumes inside Woodpecker steps. That keeps the repo compatible with non-trusted Woodpecker project settings while still letting CI publish the exact Docker image first.

Operational notes:

- SSH keys should be one-line base64 encodings of the private deploy key content
- manual reruns are allowed in addition to push-triggered runs
- stale `deploy.lock` files should be treated as interrupted deploy residue, not as proof that a deploy is still active
- CI deploy entrypoints now wait and retry for a short window if another deploy is actively holding the lock, instead of failing immediately on the first contention
- lock contention messages should report the holder's original start time and PID, rather than the retrying process's own start time
- deploy notifications should be structured webhook payloads; chat formatting belongs in the notification service

### Reading CI-safe deploy logs

In Docker-based deploys, these log lines are expected informational skips, not deployment problems:

- `Bun not installed on host, skipping API generation check`
- `Bun not installed on host, skipping i18n check`
- `php not found on host; skipping OpenAPI spec generation`

They appear because the actual build happens inside Docker rather than relying on host-installed Bun or PHP.

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

## Data Recovery

- **Rollback** (`rollback.sh`): Revert code changes to a previous deployment snapshot while preserving database data
- **Restore**: Recover data through the shared backup system outside this repository

Use rollback for code issues, use restore for data recovery.

### Production Recommendations

1. Verify shared backup coverage before changing DB or storage topology.
2. Test restore procedures against shared infrastructure, not repo scripts.
3. Keep rollback snapshots available for code-only incidents.

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
