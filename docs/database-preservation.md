# Why Your Database Gets Empty After Deploy

## The Short Answer

**Your deploy script should NOT be emptying the database by default.** If it is, one of these is happening:

1. ✅ **FIXED** (v2) - The script is now explicitly designed to preserve data
2. ❌ **Unlikely** - You're accidentally running with `--fresh` flag
3. ❌ **Rare** - Docker volumes aren't persisting (system issue)

## What Changed in the Updated Script

### Before (Original Behavior)
```bash
if [ "$FRESH" = "true" ]; then
    docker compose down -v  # Remove volumes with -v flag
fi
```
- Only removed volumes when `--fresh` flag was used
- Default deploy should preserve data

### After (Explicit Clarity)
```bash
if [ "$FRESH" = "true" ]; then
    echo "⚠️ WARNING: All database data and volumes will be DELETED"
    docker compose down -v  # Remove volumes with -v flag
else
    echo "ℹ️ Normal deploy (data preservation mode)"
    echo "ℹ️ Existing database data will be PRESERVED"
    docker compose down  # Stop containers WITHOUT removing volumes
fi
```

## Deploy Script Modes Explained

### Default: `./utils/deploy.sh`
```
✓ Rebuilds Docker containers
✓ Runs php artisan migrate (applies NEW migrations only)
✓ PRESERVES all existing database data
✓ PRESERVES all uploaded files
✓ Best for: normal updates/deployments
```

### With Seed: `./utils/deploy.sh --seed`
```
✓ Same as above
✓ PLUS runs php artisan db:seed
✓ Adds sample data to existing database
✓ Best for: dev/testing with fresh sample data
```

### Fresh: `./utils/deploy.sh --fresh`
```
✗ DELETES the entire database
✗ DELETES all volumes (uploads, etc.)
✗ Creates fresh empty schema
✗ Requires --seed or manual setup
✓ Best for: clean slate, testing migrations
```

### Fresh + Seed: `./utils/deploy.sh --fresh --seed`
```
✗ DELETES everything (like --fresh)
✓ Then seeds with sample data
✓ Best for: resetting to demo state
```

## How to Verify Your Data is Persisting

Use the debug script:
```bash
bash ./utils/debug-db-volume.sh
```

This will show:
- Available Docker volumes
- Database connection status
- Count of tables in the database

## Troubleshooting

### "My data disappears after deploy"
1. Check you're NOT using `--fresh` flag
2. Run: `docker compose down` (NOT `docker compose down -v`)
3. Verify volume exists: `docker volume ls | grep pgdata`

### "I want to DELETE everything and start fresh"
Use: `./utils/deploy.sh --fresh --seed`

### "I want to keep my data but re-run all migrations"
1. Backup first: `./utils/backup.sh`
2. Run: `./utils/deploy.sh`
3. Migrations will apply on top of existing data

## PostgreSQL Volume Details

The database uses a Docker named volume: `meo-mai-moi_pgdata`

- **With `docker compose down`**: Volume remains intact ✓
- **With `docker compose down -v`**: Volume is deleted ✗
- **With `docker compose up -d --build`**: Containers restart but volume is untouched ✓

