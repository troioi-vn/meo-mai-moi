# Debugging the Docker 502 Bad Gateway Error

This document summarizes the extensive steps taken to debug a persistent "502 Bad Gateway" error in the Docker environment.

## Initial Symptoms

- `docker compose up -d --build` completes successfully.
- `curl http://localhost:8000/` consistently returns a 502 Bad Gateway error.
- Nginx logs repeatedly show `*1 connect() to unix:/var/run/php-fpm/php-fpm.sock failed (2: No such file or directory)`.

## Summary of Changes

The following changes were made to the project during the debugging process:

```diff
diff --git a/backend/Dockerfile b/backend/Dockerfile
index c6d9cd6..6a14960 100644
--- a/backend/Dockerfile
+++ b/backend/Dockerfile
@@ -34,6 +34,7 @@ RUN apt-get clean && rm -rf /var/lib/apt/lists/*
 
 # Copy custom PHP-FPM pool configuration
 COPY backend/www.conf /usr/local/etc/php-fpm.d/www.conf
+RUN rm /usr/local/etc/php-fpm.d/www.conf.default
 
 # Install Composer
 COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
@@ -59,15 +60,16 @@ RUN composer install --no-dev --optimize-autoloader
 # Switch back to root for final setup
 USER root
 
-# Create the symbolic link for storage
-# RUN php artisan storage:link
-
 # Copy Nginx and Supervisor configurations
 COPY backend/nginx-docker.conf /etc/nginx/sites-available/default
 COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
+COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
+
+# Make the entrypoint script executable
+RUN chmod +x /usr/local/bin/docker-entrypoint.sh
 
 # Expose port 80 for Nginx
 EXPOSE 80
 
-# Start Supervisor to manage Nginx and PHP-FPM
-CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
+# Set the entrypoint to our new script
+ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
diff --git a/backend/nginx-docker.conf b/backend/nginx-docker.conf
index 1be0e4e..85016f2 100644
--- a/backend/nginx-docker.conf
+++ b/backend/nginx-docker.conf
@@ -29,7 +29,7 @@ server {
     # Handle PHP files
     location ~ \.php$ {
         include fastcgi_params;
-        fastcgi_pass 127.0.0.1:9000;
+        fastcgi_pass unix:/var/run/php-fpm/php-fpm.sock;
         fastcgi_index index.php;
         fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
     }
diff --git a/backend/supervisord.conf b/backend/supervisord.conf
index 60229d1..fefbf41 100644
--- a/backend/supervisord.conf
+++ b/backend/supervisord.conf
@@ -6,7 +6,6 @@ pidfile=/var/run/supervisord.pid
 
 [program:php-fpm]
 command=/usr/local/sbin/php-fpm -F
-user=root
 stdout_logfile=/dev/stdout
 stdout_logfile_maxbytes=0
 stderr_logfile=/dev/stderr
diff --git a/backend/www.conf b/backend/www.conf
index 4b9b90b..5be37c6 100644
--- a/backend/www.conf
+++ b/backend/www.conf
@@ -1,9 +1,10 @@
 [www]
 user = www-data
 group = www-data
-listen = 127.0.0.1:9000
+listen = /var/run/php-fpm/php-fpm.sock
 listen.owner = www-data
 listen.group = www-data
+listen.mode = 0660
 pm = dynamic
 pm.max_children = 5
 pm.start_servers = 2
diff --git a/roadmap.md b/roadmap.md
index 856b91f..92268cd 100644
--- a/roadmap.md
+++ b/roadmap.md
@@ -11,6 +11,9 @@ This document outlines the strategic development plan for the Meo Mai Moi projec
 - **Goal:** Establish the core project infrastructure, including backend and frontend scaffolding, development tools, and documentation setup.
 
 #### Infrastructure & DevOps
+- **Task: Update Node.js Version**
+  - **Status:** `To Do`
+  - **Notes:** The current Node.js version (18.x) is causing warnings with Vite. We need to upgrade to a newer LTS version (e.g., 20.x) across the entire project (local development, Docker, CI/CD) to ensure compatibility and avoid future issues.
 - **Task: Docker Optimization**
   - **Status:** `Done`
   - **Notes:** Implemented multi-stage builds with optimized caching and permission management.

```

**Additional Changes (not in initial diff):**

*   **`backend/Dockerfile`:**
    *   Added `RUN rm /usr/local/etc/php-fpm.d/zz-docker.conf` to remove another conflicting default PHP-FPM configuration.
    *   Added `procps` and `net-tools` to `apt-get install` for better debugging utilities within the container.
    *   Removed `pdo_sqlite` from `docker-php-ext-install` to align with the decision to use PostgreSQL exclusively in Docker.
*   **`backend/.env.docker`:**
    *   Created this new file to hold PostgreSQL database connection settings (`DB_CONNECTION=pgsql`, `DB_HOST=db`, etc.).
    *   Removed `REDIS_` settings as they were not being used.
*   **`docker-compose.yml`:**
    *   Modified the `backend` service to use `env_file: ./backend/.env.docker` to load environment variables.
    *   Temporarily added `entrypoint: sh` and `command: -c "sleep 1h"` to the `backend` service for manual debugging, then reverted.
*   **`backend/docker-entrypoint.sh`:**
    *   Added `sleep 2` before starting `supervisord` to mitigate potential race conditions during startup.

## Debugging Steps

1.  **Initial Analysis:** The error message clearly pointed to a communication problem between Nginx and PHP-FPM, specifically that Nginx could not find the PHP-FPM Unix socket. The `git diff` showed a recent change from TCP to Unix socket communication.

2.  **PHP-FPM User & Permissions:**
    *   The `supervisord.conf` was modified to run `php-fpm` as the `www-data` user.
    *   A `docker-entrypoint.sh` script was introduced to create the `/var/run/php-fpm` directory and set `www-data` ownership and `775` permissions. This was verified by checking the script's log (`/tmp/entrypoint.log`).
    *   `supervisord.conf` was adjusted to run the `php-fpm` master process as `root`, allowing it to manage worker processes as `www-data`.

3.  **Conflicting PHP-FPM Configurations:**
    *   Discovered `www.conf.default` was being loaded, causing `php-fpm` to attempt to bind to TCP port 9000, leading to "Address already in use" errors. This file was removed from the `Dockerfile`.
    *   Later, `grep -r "listen = " /usr/local/etc/` revealed `zz-docker.conf` also configured `listen = 9000`. This file was also removed from the `Dockerfile`.

4.  **Database Configuration Mismatch:**
    *   Identified that the `backend/.env` file configured `DB_CONNECTION=sqlite`, while the Docker image was installing `pdo_pgsql`. This mismatch was a strong candidate for causing PHP-FPM crashes.
    *   The solution implemented was to introduce `backend/.env.docker` for PostgreSQL settings and configure `docker-compose.yml` to load it, ensuring the Docker environment uses PostgreSQL. The `Dockerfile` was updated to only install `pdo_pgsql`.

5.  **Manual Container Debugging & Process Inspection:**
    *   The `docker-compose.yml` was repeatedly modified to allow `exec` into the `backend` container with a shell.
    *   Attempts to run `php-fpm -F -O` directly revealed the "Address already in use" error (due to `www.conf.default` and `zz-docker.conf`).
    *   Installed `procps` and `net-tools` in the Dockerfile to enable `ps aux` and `netstat` for process and socket inspection.
    *   `ps aux` and `netstat` confirmed that PHP-FPM was indeed running and listening on `/var/run/php-fpm/php-fpm.sock`, and Nginx worker processes were running as `www-data`. Socket permissions were also confirmed to be correct (`srw-rw----` owned by `www-data:www-data`).

6.  **Race Condition Mitigation:**
    *   Given that PHP-FPM was confirmed to be running and Nginx had correct configuration and permissions, a timing issue (race condition) was suspected.
    *   A `sleep 2` command was added to `backend/docker-entrypoint.sh` before `supervisord` starts, to give PHP-FPM more time to fully initialize its socket.

## Current State & Conclusion

Despite all the detailed debugging, configuration corrections, and attempts to mitigate timing issues, the "502 Bad Gateway" error persists.

**What is known:**
*   PHP-FPM is successfully starting and listening on the Unix socket `/var/run/php-fpm/php-fpm.sock`.
*   Nginx is configured to connect to this exact socket.
*   Nginx worker processes run as the `www-data` user, which has the necessary permissions to access the socket.
*   Conflicting default PHP-FPM configurations (`www.conf.default`, `zz-docker.conf`) have been identified and removed from the Docker image build.
*   The database configuration is now correctly set for PostgreSQL in the Docker environment, eliminating a potential Laravel boot issue.
*   The `docker-entrypoint.sh` script correctly sets up the socket directory and permissions, and a `sleep` has been added to address potential race conditions.

The root cause of the persistent 502 error remains elusive. The symptoms (Nginx reporting "No such file or directory" for a socket that demonstrably exists and is being listened on by PHP-FPM) suggest a very subtle environmental, networking, or timing issue within the Docker containerization that is not immediately apparent from standard logging or inspection. Further advanced debugging tools or a deeper dive into the Docker networking layer might be required.