# Utils Directory - Deployment & Maintenance Scripts

## 🚀 Main Deployment Script

**Use this for all deployments:**

```bash
./utils/deploy.sh                          # Normal deploy (preserves data)
./utils/deploy.sh --seed                   # Deploy + seed with sample data
./utils/deploy.sh --fresh                  # Reset everything (asks for confirmation)
./utils/deploy.sh --fresh --seed           # Fresh start with sample data (asks for confirmation)
./utils/deploy.sh --fresh --no-interactive # Fresh deploy without prompts (for CI/automation)
./utils/deploy.sh --skip-build             # Skip Docker builds (uses existing images)
./utils/deploy.sh --allow-empty-db        # Allow deploy even if DB is empty (non-fresh)
```

See `./utils/deploy.sh --help` for full options.

Logs:

- Per-run logs are written to `.deploy/deploy-YYYYMMDD-HHMMSS.log` and `.json`.
- Convenience symlinks to the latest run: `.deploy.log` and `.deploy.log.json` at repo root.
- Logs older than 30 days are automatically removed.

## 🔐 Safety Features

- **Confirmation prompts** for `--fresh` deployments (asks before deleting data)
- **`--no-interactive` flag** to skip confirmations for automated scripts/CI pipelines
- **Data preservation** by default - normal deploys never delete existing data
- **Empty DB guard** — blocks deploy when the database appears empty unless `--allow-empty-db` or `--seed` is passed
- **DB snapshots** — logs users count and watched admin presence before/after
- **Volume fingerprint** — detects if the Postgres volume was re-initialized and logs CreatedAt changes

## 🛠️ Other Utility Scripts

- **backup.sh** - Create timestamped database backups as `.sql.gz`
- **restore.sh** - Interactive restore from backup files

## 🔑 Seeder Overrides

Configure the initial Super Admin credentials via environment variables in `backend/.env*`:

```
SEED_ADMIN_EMAIL=admin@catarchy.space
SEED_ADMIN_PASSWORD=password
# Optional: SEED_ADMIN_NAME="Super Admin"
```

`DatabaseSeeder` and `deploy.sh` will honor these values when seeding and when checking for the admin user during deployments.

## 🔁 Backup & Restore Formats

- Database backups are created as gzip-compressed files: `backups/backup-YYYY-MM-DD_HH-MM-SS.sql.gz`
- The restore tool supports both the new `.sql.gz` files and legacy `db_backup_*.sql` files.

## ⚠️ Important Notes

- **DO NOT** use old deploy scripts in `/tmp` or elsewhere
- The `utils/deploy.sh` is the **single source of truth** for deployments
- Always use `--help` flag if unsure about options
- Use `./utils/backup.sh` before running `--fresh` deploy
