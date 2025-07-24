# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented the initial Placement Request feature, allowing cat owners to create foster and adoption requests.
- Added a modal for creating placement requests on the cat profile page.

### Changed
- Updated frontend dependencies: `react-router-dom` to 7.7.1 and `zod` to 4.0.8.
- Upgraded npm to version 11.5.1 for improved stability and new features.

### Fixed
- Resolved critical data loss issue by configuring a Docker named volume (`uploads_data`) to ensure user-uploaded images persist across deployments.
- Corrected a build issue with the `PlacementRequest` type import.
- Fixed a UI bug where the select component in the placement request dialog had a transparent background.

### Removed
- Removed the "Back" button from the cat profile page for a cleaner user interface.

## [0.4.0] - 2025-07-24 - Alpha Release

### Added
- New scripts to automate frontend-backend asset integration:
  - `frontend/scripts/copy-assets.cjs`: Copies the entire frontend build output to the backend public directory.
  - `frontend/scripts/postbuild-copy-assets.cjs`: Updates the Blade template with new, hashed asset filenames and copies the frontend build output to the backend public directory.
  - `frontend/scripts/postbuild-copy-assets.js`: Copies latest frontend build assets to backend public assets directory.
  - `frontend/scripts/update-blade.cjs`: Reads the Vite manifest and updates the Blade template with the new asset filenames.
- `NotificationBell.test.tsx` to test rendering of the notification bell icon in the frontend.
- Dockerfile: Added `procps` and `net-tools` for debugging within the container.

### Changed
- Refactored backend authentication to use session-based login/logout, removing token creation and deletion in AuthController.
- Updated Sanctum config to use only 'web' guard and simplified stateful domains.
- Added session and cookie middleware to Laravel API routes in bootstrap/app.php.
- Removed Authorization header logic from frontend axios interceptor.
- Refactored frontend AuthContext to remove localStorage token handling and rely on session.
- Updated Dockerfile and docker-compose.yml for persistent uploads and cache clearing.
- Updated welcome.blade.php to use latest built asset.
- Updated composer dependencies and lockfile.
- Dockerfile: Removed conflicting PHP-FPM configurations (`www.conf.default`, `zz-docker.conf`).
- Nginx configuration (`nginx-docker.conf`): Switched to Unix socket for PHP-FPM communication.
- Supervisor configuration (`supervisord.conf`): Adjusted logfile path and process priorities.
- PHP-FPM configuration (`www.conf`): Configured to listen on Unix socket.
- Docker Compose (`docker-compose.yml`): Added `env_file` for backend service.
- Frontend `package.json`: Modified `build:docker` script to include `assets:copy`.
- Frontend components (`UserAvatar.tsx`, `UserMenu.tsx`): Updated default avatar import method.
- Roadmap (`roadmap.md`): Added task to update Node.js version.

### Breaking Change
- API now uses session/cookie authentication instead of token-based. Frontend and backend must be deployed together for authentication to work.

### Fixed
- Resolved 502 Bad Gateway error in Dockerized backend.
- Resolved missing default avatar image in frontend.
- Resolved "Undefined table" error by running Laravel migrations and seeders.
- Resolved 413, 422, and 500 errors related to file uploads by correcting Nginx, PHP, and Docker configurations.
- Fixed routing issue for direct URL access in the SPA.
- Corrected file permissions for user-uploaded images, resolving 404 errors.

---

## [0.3.0] - 2025-07-15

### Added
- Frontend: Added new `auth-context.tsx` file to separate context definition from provider implementation.
- Frontend: Added comprehensive error logging in registration form for better debugging.

### Changed
- Frontend: Refactored authentication architecture for better separation of concerns.
- Frontend: Improved error handling consistency across forms.
- Frontend: Enhanced component implementations and UI component architecture.
- Frontend: Improved test infrastructure and configuration.

### Removed
- Frontend: Removed the unused `HomeButton` component and all its references.

### Fixed
- Linting: Resolved majority of ESLint errors and improved type safety.
- React Best Practices: Improved component implementations and promise handling.
- Note: Some React 19 warnings remain for `forwardRef` usage and context providers, which are acceptable for current shadcn/ui components.

---

## [0.2.0] - 2025-07-15

### Added
- Backend: Added `cats()` relationship to `User` model.
- Frontend: Added `postcss.config.js` for Tailwind CSS and Autoprefixer.
- Frontend: Created `badge-variants.ts` and `button-variants.ts` for React Fast Refresh compatibility.

### Changed
- Backend: Refactored `CatController` authorization to use manual checks instead of `authorizeResource`.
- Frontend: Standardized import statements and improved error handling and type safety.
- Frontend: Updated styling and structure in major components and pages.

### Removed
- Backend: Removed `__construct` with `authorizeResource` from `CatController.php`.
- Frontend: Removed social media icon buttons from `Footer.tsx` due to deprecation warnings.

### Fixed
- General: Addressed numerous ESLint errors and improved code stability.
- Ref Forwarding: Corrected the implementation of `React.forwardRef` in several components.
- Fast Refresh: Fixed `react-refresh/only-export-components` errors.
- Error Handling: Standardized and improved error handling in forms and dialogs.
- Promise Handling: Correctly handled promises in various components.
- Imports & Modules: Corrected the import path for `useAuth` hook and `buttonVariants`.
- Configuration: Updated `frontend/tsconfig.json` to correctly include all necessary files.
- Testing: Repaired broken tests by mocking dependencies correctly and updating providers.
- UI/UX: Removed the now-redundant `HomeButton` from login and registration pages.

---

## [Earlier]

### Added
- Initial project setup for backend (Laravel) and frontend (Vite + React + TypeScript).
- Static site generator (`VitePress`) for documentation.
- OpenAPI documentation with `l5-swagger` for backend.
- ESLint, Prettier, and PHP-CS-Fixer for code style.
- User authentication, cat listing, profile management, reviews, comments, and transfer request features.
- Comprehensive backend and frontend test suites, including MSW and Vitest for frontend.
- Admin panel with Filament, role/permission management, and cat photo management.
- Docker and deployment scripts for local and production environments.
- Extensive documentation and changelog tracking.

### Changed
- Major refactors for API response consistency, test reliability, and UI/UX improvements.
- Standardized error handling, permission logic, and test architecture.
- Improved Docker, Vite, and build processes for developer experience.

### Fixed
- Numerous bug fixes across backend and frontend, including authentication, API response handling, test stability, and UI issues.
- Improved error handling and test coverage for all major features.
