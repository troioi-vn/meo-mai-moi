# Problem Summary

The primary problem is that backend tests (PHPUnit) are consistently failing. This failure manifests in two main ways:
1.  **Database Connection/Authentication Errors:** Tests report "Connection refused" or "password authentication failed" when attempting to interact with the PostgreSQL database.
2.  **Routing (404) Errors:** Tests receive a 404 (Not Found) response when making HTTP requests to API endpoints, indicating that the test requests are not correctly reaching the Laravel application.

# Attempted Solutions

Multiple approaches have been tried to resolve these issues:

## 1. PHP Extension (`mbstring`) Issue
-   **Attempt:** Initial test run failed with "mbstring extension not available".
-   **Action:** Rebuilt Docker containers (`docker-compose down && docker-compose up -d --build`) and ran `composer install` inside the `laravel.test` container.
-   **Outcome:** `mbstring` was confirmed to be present in PHP configuration, suggesting the error message was misleading. Switched to running `vendor/bin/phpunit` directly to bypass potential `artisan` command environment issues.

## 2. Database Connectivity and Authentication
-   **Attempt:** Persistent "password authentication failed" and "Connection refused" errors.
-   **Action:**
    -   Generated a new `APP_KEY` and updated `backend/.env`.
    -   Attempted `php artisan migrate:fresh --seed` to re-initialize the database.
    -   Tried to manually connect to the PostgreSQL container using `psql` from within the `laravel.test` container to debug connectivity (encountered "role 'postgres' does not exist" and "database 'meomaimoi' does not exist" errors).
    -   Modified `docker-compose.yml` to explicitly set `PGPASSWORD` for the `pgsql` service.
    -   Rebuilt containers after `docker-compose.yml` changes.
    -   Attempted to manually create the database and user with `psql` using the `meomaimoi` user.
    -   Reverted `DB_PORT` in `backend/.env` to `5432` (internal container port) after a brief attempt to use `5433` (host mapped port).
    -   Simplified `docker-compose.yml` to use default `postgres` user and `password` for the `pgsql` service, and updated `backend/.env` accordingly.
    -   Attempted to introduce a `sleep` delay before running migrations and tests to allow PostgreSQL to fully start.
-   **Outcome:** Database connection errors persisted, indicating the Laravel application still couldn't reliably connect to PostgreSQL.

## 3. Routing (404) Errors
-   **Attempt:** Tests started returning 404 errors, suggesting requests weren't reaching the Laravel application.
-   **Action:**
    -   Confirmed `APP_URL` in `backend/.env` was `http://localhost`.
    -   Modified `phpunit.xml` to set `APP_URL` to `http://laravel.test` for the test environment.
    -   Modified `backend/tests/TestCase.php` to explicitly set `app.url` and `app.asset_url` to `http://laravel.test` within the `setUp` method.
    -   Attempted to use `depends_on` with `condition: service_healthy` in `docker-compose.yml` for the `pgsql` service to ensure it's ready before `laravel.test` starts.
-   **Outcome:** 404 errors continue, indicating the test requests are still not correctly routing to the Laravel application within the Docker network. The `docker-compose wait` command was not found, so the `service_healthy` condition might not be fully effective or correctly implemented.

# Current Status

The backend tests are still failing with 404 errors, implying a fundamental issue with how the test environment is configured to communicate with the Laravel application within the Docker network. The database connection problems are likely a symptom of this broader connectivity issue, as the application cannot interact with the database if requests aren't reaching it in the first place.