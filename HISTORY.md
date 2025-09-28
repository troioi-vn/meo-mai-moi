# History

This file contains the changelog for older versions of the project.

## [0.4.0] - 2025-09-28

### Added
- **Database Schema Squashing**: Squashed all historical migrations into a single `pgsql-schema.sql` file to speed up test runs and simplify new environment setups.
- **Multi-pet support**: The application now supports multiple pet types, including cats and dogs.
- **Pet type capabilities**: A new `placement_requests_allowed` feature has been added to control which pet types can have placement requests.
- **Helper pet types**: Helpers can now specify which pet types they are able to help with.
- **Pet type filter**: A new pet type filter has been added to the `/requests` page.
- Frontend (Pet Health): Vaccinations section with full owner-only CRUD, capability-gated, validation, and tests.
- Frontend (Pet Health): Default dates in forms — weight and medical note dates default to today; vaccination administered_at defaults to today and due_at defaults to one year from today.
- Pet Health (Phase 1): Weight tracking
- Env: Added `FRONTEND_URL` environment variable across local and Docker env files to represent the SPA base URL used in emails and redirects.
- **Password Reset System**: Complete password recovery functionality with professional email notifications.
- **Comprehensive SMTP Email System**: Complete SMTP infrastructure with multiple provider support and advanced email tracking.
- **Enhanced Login UI**: Complete redesign of authentication interface using shadcn/ui components.
- **Email Notifications System**: Comprehensive email notification system for placement requests and helper responses.
- Admin: User impersonation support in Filament.
- API Auth semantics (api/*): Force JSON unauthenticated responses.
- Transfer responder visibility: New policy ability `viewResponderProfile` so owners/recipients/initiators can see the responder’s helper profile for a transfer request.
- **Transfer Handover Lifecycle:** Introduced a post-accept procedure to safely hand over the cat.
- **Ownership History:** New `ownership_history` table and model.
- **My Cats sections (`/api/my-cats/sections`):** `transferred_away` now derives from `ownership_history`.
- **Transfer Finalization:** Ownership changes for permanent transfers occur on handover completion.
- **Backfill Command:** `php artisan ownership-history:backfill` to create initial records.
- **Placement Response System**: Implemented the core functionality for helpers to respond to placement requests.
- **Helper Profile Feature**: Implemented full CRUD functionality for Helper Profiles.
- Added a "Helper Profiles" link to the user navigation menu.
- Added `start_date` and `end_date` to the `PlacementRequest` model and API.
- Added date picker components to the frontend.
- Implemented the initial Placement Request feature.
- Added a modal for creating placement requests.
- New scripts to automate frontend-backend asset integration.
- `NotificationBell.test.tsx`.
- `procps` and `net-tools` to Dockerfile for debugging.

### Changed
- Backend: `/api/version` is now driven by configuration via `config/version.php` and the `API_VERSION` env var.
- Admin: `PetTypeResource` now explicitly exposes "Weight tracking allowed" and "Microchips allowed" toggles in both the form and the table.
- Backend: `PetCapabilityService` handles dynamic capabilities for placement, weights, and microchips based on `PetType` flags.
- Backend: `PetType` model includes sensible defaults and casts for capability flags.
- Seeder: Cleaned and de-conflicted `PetTypeSeeder` to ensure Cat/Dog system types exist with expected capability flags.
- Docker: Optimized runtime image by avoiding global recursive `chown`; used `COPY --chown` and targeted `install -d` ownership only for Laravel-writable directories (`storage/**`, `bootstrap/cache`). This reduces build time and image layer churn.
- **Docs**: Updated `GEMINI.md` with a new "Linting and Formatting" section.
- **Backend**: Ran `pint` to fix PHP code style issues.
- **`cat` to `pet` rename**: The term `cat` has been renamed to `pet` throughout the codebase to reflect the new multi-pet support.
- Frontend (Pet Health): Human‑readable date display for health records (weights, medical notes, vaccinations) using locale formatting instead of raw ISO strings.
- Frontend: Restored Remove/status change flow in Pet Details with dialog (lost/deceased), password confirmation, and toasts; refreshes profile on success.
- Env/Config: Standardized URLs between backend and SPA.
- Backend Docker build: Upgraded Composer from 2.7 to 2.8.
- Docker startup: stabilized DB readiness by using a simple `pg_isready` host:port probe.
- Compose: simplified DB healthcheck.
- Frontend: Refined Cat Profile responses and handover UI.
- Frontend: Helper Profile dialog tightened types and display logic.
- **Redirect to login page after logout.**
- **Authorization Centralization:** `CatController@show` now relies on policies.
- **Admin Middleware:** Updated to support both enum-backed roles and string roles.
- **Docker Entrypoint/Env:** Entry point now generates `.env` as a fallback and creates `APP_KEY` when missing.
- **Auth Session Behavior:** Register/Login also establish a Sanctum session.
- **Login Redirect**: Improved the login redirect logic.
- **Transfer Acceptance Flow**: Accepting a transfer response now fulfills the related placement request transactionally.
- **Transfer Acceptance Flow (deferred finalization)**.
- **Cat Visibility Policy**: Active fosterers are allowed to view the cat profile.
- API exception handling: For `api/*`, exceptions render JSON by default.
- Proxy/IP handling: Nginx now forwards correct headers to PHP-FPM.
- TransferRequestPolicy: Broadened `accept`/`reject` to allow cat owner or `recipient_user_id`.
- Frontend: My Cats page UX polish.
- **Backup & Restore Scripts**: Improved to be more robust.
- **`.gitignore` & `.dockerignore`**: Updated to ignore unnecessary files.
- **Helper Profile**: User is now routed to the view page after update.
- Updated frontend dependencies.
- Upgraded npm to version 11.5.1.
- Refactored backend authentication to use session-based login/logout.
- Updated Sanctum config.
- Added session and cookie middleware to Laravel API routes.
- Removed Authorization header logic from frontend axios interceptor.
- Refactored frontend AuthContext to rely on session.
- Updated Dockerfile and docker-compose.yml for persistent uploads and cache clearing.
- Updated welcome.blade.php to use latest built asset.
- Updated composer dependencies and lockfile.
- Updated Nginx, Supervisor, and PHP-FPM configurations.
- Modified `build:docker` script in frontend `package.json`.
- Updated default avatar import method in frontend components.
- Added task to update Node.js version in roadmap.

### Fixed
- **Docker Startup Race Condition**: Fixed a critical race condition where the backend container would attempt to run migrations before the database was fully ready. The entrypoint script was updated to use a more robust `psql` check instead of `pg_isready`.
- Backend: Removed leftover merge conflict markers that caused a syntax error in `PetTypeResource.php` and related classes; reconciled implementations and restored a green test suite.
- Frontend: Resolved merge conflict markers across key pages, hooks, and API modules that blocked Vite builds; test suite green.
- **Helper profile deletion crash**: Fixed a crash that occurred when deleting a helper profile.
- **Non-editable inputs on helper profile edit page**: Fixed an issue where the inputs on the helper profile edit page were not editable.
- **Removed placement request availability message**: Removed the "Placement requests not available for..." message from the `PetCard` component.
- Frontend (Pet Profile): Resolved 403 on update by converting ISO dates to `YYYY-MM-DD` for HTML date inputs.
- Frontend: Removed duplicate Edit button from owner actions.
- Frontend: Repaired regressions in `WeightForm.tsx` and `PetProfilePage.tsx` introduced during earlier edits.
- **Password Reset Configuration**: Fixed password reset link generation to use correct frontend port.
- **Filament Admin Panel**: Fixed TypeError in Select component where null label values caused Internal Server Error.
- Frontend: CatCard "Fulfilled" badge incorrectly showed for new/open placement requests.
- **API/Policy**: Fixed 403 when viewing your own cat.
- Frontend Linting/Type Safety: Large cleanup pass across multiple files.
- Frontend Linting/Type Safety: Final sweep to zero ESLint errors.
- **API Routing:** Removed duplicate `/api/version` route declaration.
- **Test Stability**: Improved the reliability of tests in `EditCatPage.test.tsx`.
- **MyCatsPage Hooks Order**: Fixed a React hooks ordering error.
- **API**: Resolved 404 and empty array issues with `/api/cats/placement-requests` endpoint.
- **Database**: Resolved several database migration issues.
- **Backend Test Environment**: Resolved persistent database migration issues in the test environment.
- **Transfer Request Functionality**: Fixed `TransferRequestCreationTest` failures.
- **API Documentation**: Resolved OpenAPI documentation generation syntax errors.
- **Vite/Vitest CSS Handling**: Resolved a critical issue where Vitest tests were failing due to incorrect CSS parsing.
- Adjusted backend tests to reflect owner/admin-only access for cat profiles.
- **PlacementRequestModal Tests**: Temporarily disabled two tests due to timeouts.
- **Frontend Tests**: Re-enabled and fixed previously disabled tests.
- **Docker Environment**: Overhauled for robustness.
- **Authentication**: The entire authentication flow was fixed.
- **API Documentation**: The OpenAPI (Swagger) documentation was fixed.
- **File Permissions**: Corrected `storage` directory permissions.
- **Test Failures**: Fixed `sonner` library and test selector issues.
- **Frontend Tests**: Resolved multiple test failures with polyfills and logic fixes.
- API unauthenticated 500s: Eliminated `Route [login] not defined` errors.
- HelperProfile delete: Hardened deletion to clean up stored photos.
- Backend tests: Addressed flaky/failed tests.
- Resolved critical data loss issue with a Docker named volume.
- Corrected a build issue with the `PlacementRequest` type import.
- Fixed a UI bug with the select component background.
- Resolved 502 Bad Gateway error in Dockerized backend.
- Resolved missing default avatar image in frontend.
- Resolved "Undefined table" error by running migrations and seeders.
- Resolved 413, 422, and 500 errors related to file uploads.
- Fixed routing issue for direct URL access in the SPA.
- Corrected file permissions for user-uploaded images.

### Removed
- **Helper Profile**: Removed the `zip_code` field from the helper profile.
- Redundant frontend Axios client.
- "Back" button from the cat profile page.

### Docs
- OpenAPI: Regenerated API docs to sync with current endpoints, resolving the `ApiContractTest` mismatch.

### QA
- Frontend: Test suite passing.
- Backend: Test suite passing (including `ApiContractTest`).

### Breaking Change
- API now uses session/cookie authentication instead of token-based.

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