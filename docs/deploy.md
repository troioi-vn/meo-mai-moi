# Production Deployment Guide

This guide provides a step-by-step process for safely deploying updates to the Meo Mai Moi production environment.

## Prerequisites

- You have `docker` and `docker-compose` installed.
- You have cloned the project repository and are in the project's root directory.
- You have run `chmod +x backup.sh restore.sh` to make the helper scripts executable.

## Deployment Workflow

This workflow is designed to minimize downtime and provide a safe rollback path.

### Phase 1: Preparation (Pre-Deployment)

1.  **Put the Application in Maintenance Mode:**
    This will display a user-friendly maintenance page to your visitors and prevent data inconsistencies during the update.
    ```bash
    docker compose exec backend php artisan down
    ```

2.  **Create a Full Backup:**
        The `backup.sh` script creates timestamped backups of both the database and all user-uploaded files in the `backups/` directory.
    ```bash
    ./scripts/backup.sh
    ```

### Phase 2: Deployment

3.  **Pull the Latest Code:**
    Get the newest version of the application from your Git repository.
    ```bash
    git pull origin main  # Or whichever branch you use for production
    ```

4.  **Build and Restart the Services:**
    This command builds the new Docker image with your latest code and then gracefully restarts the containers.
    ```bash
    docker compose up -d --build
    ```

5.  **Run Database Migrations:**
    Once the new `backend` container is running, apply any new database migrations. This command is safe to run even if there are no new migrations.
    ```bash
    docker compose exec backend php artisan migrate --force
    ```

6.  **Clear Application Caches:**
    Ensure the Laravel application is using all the new code and configuration by clearing its internal caches.
    ```bash
    docker compose exec backend php artisan optimize:clear
    ```

### Phase 3: Go Live & Verify

7.  **Disable Maintenance Mode:**
    Bring your application back online for visitors.
    ```bash
    docker compose exec backend php artisan up
    ```

8.  **Verify the Deployment:**
    - Check that the containers are running and healthy: `docker compose ps`
    - Check the application logs for any errors: `docker compose logs backend`
    - Open the website in a browser and test its core functionality.

---

## Emergency Rollback Plan

If something goes wrong during or after deployment, follow these steps to revert to the previous state.

1.  **Re-enable Maintenance Mode:**
    ```bash
    docker compose exec backend php artisan down
    ```

2.  **Restore from Backup:**
    Run the interactive restore script. You can choose to restore the database, the user uploads, or both.
    ```bash
    ./restore.sh
    ```

3.  **Revert the Code:**
    Check out the last known good commit from your Git history.
    ```bash
    git log
    # Find the commit hash you want to revert to, then:
    git checkout <commit-hash>
    ```

4.  **Re-Deploy the Old Version:**
    Run the build and migration commands again to ensure the old version is running correctly.
    ```bash
    docker compose up -d --build
    docker compose exec backend php artisan migrate --force
    docker compose exec backend php artisan optimize:clear
    ```

5.  **Disable Maintenance Mode:**
    ```bash
    docker compose exec backend php artisan up
    ```
