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

For CI-driven development deployment on the server, use:

```bash
./utils/deploy-ci-dev-ab.sh
```

`deploy-ci-dev-ab.sh` is the preferred Woodpecker entrypoint for `dev.meo-mai-moi.com`. It deploys into the inactive slot, verifies that slot, then switches NGINX over only after the new slot is healthy. It intentionally skips the old self-updating git sync flow because CI already decides which commit is being deployed.

Current Woodpecker dev flow:

1. decode `DEV_DOCKER_BUILD_ENV_B64` into build-time frontend variables
2. build `registry.int.catarchy.space/troioi-vn/meo-mai-moi:dev-<commit-sha>` in CI
3. also push `registry.int.catarchy.space/troioi-vn/meo-mai-moi:dev-latest`
4. SSH to `catarchy2`, reset the long-lived checkout to the exact pushed commit
5. run `deploy-ci-dev-ab.sh` with:
   - `BACKEND_IMAGE=registry.int.catarchy.space/troioi-vn/meo-mai-moi:dev-<commit-sha>`
   - `BACKEND_IMAGE_PULL_POLICY=always`
   - `DEPLOY_USE_PREBUILT_IMAGE=true`
6. build docs on-host, pull the immutable backend image, verify the inactive slot, then switch NGINX
7. send shared infra notifications:
   - deploy started
   - A/B switch completed
   - deploy finished or failed

The `DEV_DOCKER_BUILD_ENV_B64` secret is expected to provide shell-style `KEY=value` lines for the Docker build-time frontend inputs. The Woodpecker pipeline currently accepts either:

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

For `catarchy2`, the recommended root `.env` values are:

```bash
BACKEND_HOST_BIND=127.0.0.1
BACKEND_HOST_PORT=8010
REVERB_HOST_BIND=127.0.0.1
REVERB_HOST_PORT=8090
SLOT_A_BACKEND_HOST_BIND=127.0.0.1
SLOT_A_BACKEND_HOST_PORT=8001
SLOT_A_REVERB_HOST_BIND=127.0.0.1
SLOT_A_REVERB_HOST_PORT=8081
SLOT_B_BACKEND_HOST_BIND=127.0.0.1
SLOT_B_BACKEND_HOST_PORT=8002
SLOT_B_REVERB_HOST_BIND=127.0.0.1
SLOT_B_REVERB_HOST_PORT=8082
DB_HOST_BIND=127.0.0.1
DB_HOST_PORT=5433
DB_SERVICE_MODE=external
DB_EXTERNAL_CONTAINER=shared-postgres
SHARED_SERVICES_NETWORK_EXTERNAL=true
SHARED_SERVICES_NETWORK_NAME=shared-services
```

And in `backend/.env`:

```bash
APP_URL=https://dev.meo-mai-moi.com
ENABLE_HTTPS=false
DB_HOST=shared-postgres
DB_PORT=5432
DB_DATABASE=meo_mai_moi_dev
DB_USERNAME=meo_mai_moi_dev
DB_PASSWORD=replace-me
```

This keeps Docker ports private to the host and lets host NGINX on `catarchy2` own public `80/443`.

In this mode, the backend joins the Docker network `shared-services` and uses shared PostgreSQL on `catarchy2` instead of starting its own long-lived local `db` service.

### Production A/B slots on `meo`

Production now uses the same slot-based rollout shape as development, but with a dedicated production slot helper:

```bash
./utils/deploy-ci-prod-ab.sh
```

Recommended root `.env` values on `meo`:

```bash
SLOT_A_BACKEND_HOST_BIND=127.0.0.1
SLOT_A_BACKEND_HOST_PORT=8011
SLOT_A_REVERB_HOST_BIND=127.0.0.1
SLOT_A_REVERB_HOST_PORT=8091
SLOT_B_BACKEND_HOST_BIND=127.0.0.1
SLOT_B_BACKEND_HOST_PORT=8012
SLOT_B_REVERB_HOST_BIND=127.0.0.1
SLOT_B_REVERB_HOST_PORT=8092
DB_SERVICE_MODE=external
DB_EXTERNAL_CONTAINER=shared-postgres
SHARED_SERVICES_NETWORK_EXTERNAL=true
SHARED_SERVICES_NETWORK_NAME=shared-services
```

And in `backend/.env`:

```bash
APP_ENV=production
APP_URL=https://meo-mai-moi.com
ENABLE_HTTPS=false
DB_HOST=shared-postgres
DB_PORT=5432
DB_DATABASE=meo_mai_moi
DB_USERNAME=user
DB_PASSWORD=replace-me
```

The active production slot is tracked in:

```bash
/srv/meo-mai-moi/.deploy-active-slot-prod
```

The production A/B flow is:

1. determine the inactive slot
2. pull and start only that target slot
3. verify that target slot on its host-bound port
4. rewrite the production NGINX vhost from `deploy/nginx/meo-mai-moi.com.conf.template`
5. reload NGINX and mark the new slot active
6. stop the legacy single-backend service after the first successful slot rollout

Current Woodpecker production flow mirrors development, but uses `PROD_DOCKER_BUILD_ENV_B64` and pushes:

- `registry.int.catarchy.space/troioi-vn/meo-mai-moi:prod-<commit-sha>`
- `registry.int.catarchy.space/troioi-vn/meo-mai-moi:prod-latest`

The `meo` host then deploys by pulling the immutable `prod-<commit-sha>` image instead of rebuilding source locally.

Current Woodpecker production flow:

1. decode `PROD_DOCKER_BUILD_ENV_B64` into build-time frontend variables
2. build `registry.int.catarchy.space/troioi-vn/meo-mai-moi:prod-<commit-sha>` in CI
3. also push `registry.int.catarchy.space/troioi-vn/meo-mai-moi:prod-latest`
4. SSH to `meo`, reset the long-lived checkout to the exact pushed commit
5. log into the registry on `meo`
6. run `deploy-ci-prod-ab.sh` with:
   - `BACKEND_IMAGE=registry.int.catarchy.space/troioi-vn/meo-mai-moi:prod-<commit-sha>`
   - `BACKEND_IMAGE_PULL_POLICY=always`
   - `DEPLOY_USE_PREBUILT_IMAGE=true`
7. build docs on-host, pull the immutable backend image, verify the inactive slot, then switch NGINX
8. send shared infra notifications:
   - deploy started
   - A/B switch completed
   - deploy finished or failed

Operational note:

- after the switch, the previously active slot is intentionally left running
- this is the rollback buffer for production; if the new slot misbehaves after cutover, switch NGINX back instead of waiting for a rebuild
- expect both `backend_a` and `backend_b` to be alive after a successful production rollout
- the tradeoff is higher steady-state memory usage on `meo`
- only the inactive target slot is stopped before rebuild; the old active slot is not treated as stale cleanup

Important reverse-proxy note:

- the host NGINX vhost on `meo` must be a pure reverse proxy to the active slot
- do not keep `root /srv/meo-mai-moi/backend/public` or host-side `try_files` rules in `/etc/nginx/conf.d/meo-mai-moi.com.conf`
- otherwise the host can serve `public/index.php` as a static file instead of forwarding to PHP-FPM inside the active backend container
- slot activation should always be followed by `nginx -t` before reload

### Development A/B slots on `catarchy2`

`dev.meo-mai-moi.com` now uses two backend slots on the same host:

- slot `a` -> `backend_a` on `127.0.0.1:8001` and Reverb on `127.0.0.1:8081`
- slot `b` -> `backend_b` on `127.0.0.1:8002` and Reverb on `127.0.0.1:8082`

The active slot is tracked in:

```bash
/opt/meo-mai-moi-dev/.deploy-active-slot
```

Useful operational commands on `catarchy2`:

```bash
cd /opt/meo-mai-moi-dev
./utils/dev-slot.sh status
./utils/dev-slot.sh active
./utils/dev-slot.sh inactive
```

The A/B deploy flow is:

1. determine the inactive slot
2. build or pull and start only that target slot
3. run migrations and application checks against the target slot
4. rewrite the NGINX vhost from `deploy/nginx/dev.meo-mai-moi.com.conf.template`
5. reload NGINX and mark the new slot active

This keeps the previous slot available as a rollback target and avoids the old blanket `docker compose stop` behavior during development slot deploys.

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

- A webhook receiver on the server (already installed in your environment), which validates the payload signature and triggers the same command above. Ensure the deploy user has the repository checked out with proper permissions.

### Woodpecker `dev` pipeline on `catarchy2`

The repository now includes a starter [`.woodpecker.yml`](../.woodpecker.yml) for `dev` deployments.

Current intended flow:

1. A push to `dev` triggers Woodpecker.
2. Woodpecker builds and pushes an immutable dev image to `registry.int.catarchy.space`.
3. Woodpecker SSHes into `catarchy2`.
4. On the server, the long-lived checkout at `DEV_DEPLOY_PATH` is reset to the pushed commit.
5. The server logs into the registry and runs `./utils/deploy-ci-dev-ab.sh` against the pushed image.
6. After the slot switch, Woodpecker sends the dedicated A/B switch webhook to the shared `infra-notifications` workflow in n8n.

Current dev checkout and ports on `catarchy2`:

- checkout path: `/opt/meo-mai-moi-dev`
- backend: `127.0.0.1:8001`
- reverb: `127.0.0.1:8081`
- database: shared PostgreSQL on Docker network `shared-services` (`shared-postgres:5432`)

Woodpecker secrets are intentionally split by scope:

- shared/global admin secrets:
  - `CATARCHY2_HOST`
  - `CATARCHY2_USER`
  - `CATARCHY2_SSH_KEY`
- repo-local secrets for `meo-mai-moi`:
  - `DEV_DEPLOY_PATH`
  - `DEV_DOCKER_BUILD_ENV_B64`

Recommended values:

- `CATARCHY2_HOST=10.23.0.1` - SSH host for `catarchy2` over WireGuard
- `CATARCHY2_USER=ubuntu` - SSH user on `catarchy2`
- `CATARCHY2_SSH_KEY` - base64-encoded private deploy key
- `DEV_DEPLOY_PATH=/opt/meo-mai-moi-dev` - absolute path to the dev checkout on `catarchy2`
- `DEV_DOCKER_BUILD_ENV_B64` - base64-encoded shell env file with build-time frontend args for the dev image

The pipeline currently tolerates two secret formats for `DEV_DOCKER_BUILD_ENV_B64`:

- true base64-encoded env-file content
- raw escaped env-file content copied from a shell-style `.env`

Why `CATARCHY2_HOST` is not `127.0.0.1`:

- Woodpecker steps run inside containers.
- Inside a CI container, `127.0.0.1` means the container itself, not the VPS host.
- Use the host's real reachable address instead. In this setup, the preferred address is the WireGuard IP `10.23.0.1`.

The pipeline intentionally deploys via SSH into a host checkout instead of using host-path volumes inside Woodpecker steps. That keeps the repo compatible with non-trusted Woodpecker project settings while still letting CI publish the exact Docker image first.

### Woodpecker `main` pipeline on `meo`

Current intended flow:

1. A push to `main` triggers Woodpecker.
2. Woodpecker builds and pushes an immutable prod image to `registry.int.catarchy.space`.
3. Woodpecker SSHes into `meo`.
4. On the server, the long-lived checkout at `/srv/meo-mai-moi` is reset to the pushed commit.
5. The server logs into the registry and runs `./utils/deploy-ci-prod-ab.sh` against the pushed image.
6. After the slot switch, Woodpecker sends the dedicated A/B switch webhook to the shared `infra-notifications` workflow in n8n.

Current production checkout and slots on `meo`:

- checkout path: `/srv/meo-mai-moi`
- active slot marker: `/srv/meo-mai-moi/.deploy-active-slot-prod`
- slot `a`: backend `127.0.0.1:8011`, reverb `127.0.0.1:8091`
- slot `b`: backend `127.0.0.1:8012`, reverb `127.0.0.1:8092`
- database: shared PostgreSQL on Docker network `shared-services` (`shared-postgres:5432`)

Woodpecker secrets for production:

- shared/global admin secrets:
  - `MEO_HOST`
  - `MEO_USER`
  - `MEO_SSH_KEY`
  - `REGISTRY_AUTH_USERNAME`
  - `REGISTRY_AUTH_PASSWORD`
- repo-local secrets:
  - `PROD_DOCKER_BUILD_ENV_B64`

The pipeline currently tolerates two secret formats for `PROD_DOCKER_BUILD_ENV_B64`:

- true base64-encoded env-file content
- raw escaped env-file content copied from a shell-style `.env`

Operational notes:

- `MEO_SSH_KEY` should be a one-line base64 encoding of the private deploy key content
- manual reruns are allowed in addition to push-triggered runs
- stale `deploy.lock` files should be treated as interrupted deploy residue, not as proof that a deploy is still active
- CI deploy entrypoints now wait and retry for a short window if another deploy is actively holding the lock, instead of failing immediately on the first contention
- lock contention messages should report the holder's original start time and PID, rather than the retrying process's own start time
- Telegram deploy notifications are now centralized in n8n; the pipeline only sends structured webhook payloads and does not format chat text itself

### Reading CI-safe deploy logs

For the current `catarchy2` dev setup, these log lines are expected informational skips, not deployment problems:

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
