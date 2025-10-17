# Utils Directory - Deployment & Maintenance Scripts

## 🚀 Main Deployment Script

**Use this for all deployments:**

```bash
./utils/deploy.sh                          # Normal deploy (preserves data)
./utils/deploy.sh --seed                   # Deploy + seed with sample data
./utils/deploy.sh --fresh                  # Reset everything (asks for confirmation)
./utils/deploy.sh --fresh --seed           # Fresh start with sample data (asks for confirmation)
./utils/deploy.sh --fresh --no-interactive # Fresh deploy without prompts (for CI/automation)
```

See `./utils/deploy.sh --help` for full options.

## 🔐 Safety Features

- **Confirmation prompts** for `--fresh` deployments (asks before deleting data)
- **`--no-interactive` flag** to skip confirmations for automated scripts/CI pipelines
- **Data preservation** by default - normal deploys never delete existing data

## 🛠️ Other Utility Scripts

- **backup.sh** - Create timestamped backups of database and uploads
- **restore.sh** - Interactive restore from backup files
- **ensure-docker-env.sh** - Verify Docker environment setup
- **debug-db-volume.sh** - Diagnose database volume issues

## ⚠️ Important Notes

- **DO NOT** use old deploy scripts in `/tmp` or elsewhere
- The `utils/deploy.sh` is the **single source of truth** for deployments
- Always use `--help` flag if unsure about options
- Use `./utils/backup.sh` before running `--fresh` deploy
