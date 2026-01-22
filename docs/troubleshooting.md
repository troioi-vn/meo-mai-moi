# Troubleshooting Guide

This guide provides solutions to common issues encountered during development.

## Backend Issues

**Database Connection Errors**

- Check if PostgreSQL is running: `docker compose ps db`
- Reset the database: `./utils/deploy.sh --fresh --seed`

**Database Corruption During Deployment**

- **Symptom**: Duplicate key violations, foreign key errors, or missing data after deploy
- **Cause**: Race condition if migrations run in both entrypoint and deploy.sh
- **Solution**: Ensure `RUN_MIGRATIONS=false` in docker-compose.yml (default setting)
- Migrations should ONLY run via `./utils/deploy.sh`, not during container startup
- If corruption occurs, restore from backup: `./utils/backup.sh --restore-database BACKUP_FILE` (or `./utils/restore.sh` for legacy interactive menu)

**Login Issues (Admin Password Corruption)**

- Use the deploy script to reset the admin password: `./utils/deploy.sh`

**Test Failures with RefreshDatabase**

- Install `postgresql-client` if the `psql` command is missing.
- Ensure `PetTypeSeeder` runs before pet-related tests.
- Clear caches: `php artisan optimize:clear`

**403 Errors in Tests (Policy Issues)**

- Check user roles and permissions in the test setup.
- Verify that factories create users with the proper states.

## Frontend Issues

**Build Failures**

- Clear `node_modules`: `rm -rf node_modules && bun install`
- Check for TypeScript errors: `bun run typecheck`

**Test Environment Issues**

- Radix/shadcn components may need polyfills in `setupTests.ts`.
- MSW handlers must use absolute URLs.

**Network Errors (ERR_NETWORK / AxiosError)**

- **Symptom**: API requests (especially `/api/notifications/unified`) fail with "Network Error" in the console.
- **Cause**: Adblockers (like uBlock Origin or AdBlock Plus) often block URLs containing the word "notification".
- **Solution**: Disable your adblocker for `localhost` or the development domain.

## Docker Issues

**Container Won't Start**

- Check the logs: `docker compose logs backend`
- Try rebuilding without the cache: `./utils/deploy.sh --no-cache`

**Permission Errors**

- Check file ownership in the containers.
- Verify the volume mounts in `docker-compose.yml`.
