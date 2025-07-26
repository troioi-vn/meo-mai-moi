feat: Overhaul Docker environment and fix authentication

This commit addresses a wide range of issues that were preventing the application from running correctly in a Docker environment and causing authentication failures.

**Key Changes:**

*   **Docker Overhaul**: The `Dockerfile` and `docker-compose.yml` have been completely rewritten to follow best practices, resulting in a more stable and reliable build process. The problematic `docker-compose.override.yml` has been removed, and the configuration has been consolidated.
*   **Authentication Fixes**: The entire user authentication flow (registration, login, and logout) has been fixed. The backend now correctly handles both API token-based and session-based authentication, and the frontend has been updated to align with these changes.
*   **API Documentation**: The OpenAPI (Swagger) documentation has been corrected by relocating the schema definitions from the models to the controllers, which resolves all schema reference errors.
*   **File Permissions**: The file permissions for the `storage` directory have been corrected, which resolves the "permission denied" errors that were occurring when the application tried to write to the cache or logs.
*   **Backup & Restore Scripts**: The backup and restore scripts have been improved to be more robust and user-friendly. They now save backups to a dedicated `backups/` directory and can be run from any location.
*   **`.gitignore` & `.dockerignore`**: These files have been updated to correctly ignore unnecessary files and directories, which will keep the repository clean and Docker builds fast.

These changes result in a stable, functional development environment and a much-improved developer experience.