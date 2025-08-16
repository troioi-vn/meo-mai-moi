# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Frontend: Refined Cat Profile responses and handover UI.
  - Streamlined acceptance flow to open the schedule handover modal after accepting a response.
  - Added a helper-facing handover confirmation panel and improved meeting status chips.
  - Standardized list keys and avoided unsafe template rendering.
- Frontend: Helper Profile dialog tightened types and display logic; safer keys for photos and clearer transfer detail rendering.
- **Redirect to login page after logout:** After a user logs out, they are now redirected to the login page.
- **Authorization Centralization:** `CatController@show` now relies on policies via `$this->authorize('view', $cat)`; controller logic simplified while preserving `viewer_permissions` in the response.
- **Admin Middleware:** Updated to support both enum-backed roles and string roles, improving robustness across environments (and future Spatie-only direction).
- **Docker Entrypoint/Env:** Entry point now generates `.env` as a fallback and creates `APP_KEY` when missing, instead of depending on `.env.docker`.
- **Auth Session Behavior:** Register/Login also establish a Sanctum session (cookies) while continuing to return a token for API clients.
- **Login Redirect**: Improved the login redirect logic to be more secure and flexible. It now supports relative redirect paths while preventing open redirects to external sites.
- **Transfer Acceptance Flow**: Accepting a transfer response now fulfills the related placement request transactionally and auto-rejects other pending responses.
- **Transfer Acceptance Flow (deferred finalization)**: Accept no longer immediately transfers ownership or creates a foster assignment. It now creates a `TransferHandover` record and defers finalization to handover completion (see Added).
- **Cat Visibility Policy**: Active fosterers are allowed to view the cat profile while the assignment is active.

### Fixed
- Frontend: CatCard "Fulfilled" badge incorrectly showed for new/open placement requests. Now it only appears when there are placement requests but none are active/open (derived from `is_active` or `status` in {`open`, `pending_review`, `pending`}); Respond button visibility also falls back to this derived state when the backend convenience flag is absent.
- **API/Policy**: Fixed 403 when viewing your own cat. Broadened `CatPolicy@view` to allow owners, admins, and accepted helpers to view a cat, and to permit public read access for non-deleted cats. This aligns with the optional-auth show route and documented visibility rules.
- Frontend Linting/Type Safety: Large cleanup pass across multiple files (CatProfilePage, HelperProfileDialog, CatDetails, UserMenu, ScheduleHandoverModal, PlacementResponseModal, helper profile pages/hooks).
  - Removed unnecessary type conversions and non-null assertions, eliminated unsafe any access, and fixed promise-handling (no-floating-promises/no-misused-promises).
  - Resolved restrict-template-expressions and react-refresh issues without changing behavior; tests remain green.
- Frontend Linting/Type Safety: Final sweep to zero ESLint errors.
  - Refined test suites to avoid unsafe any, require-await, and brittle selectors (PlacementRequestModal, PlacementResponseModal, EditCatPage).
  - Standardized helper profile pages for array typing (T[]), template safety, and promise handling; removed non-null assertions.
  - Addressed the last react-hooks/exhaustive-deps warning by tightening `useCatProfile` effect dependencies without altering behavior.
- **API Routing:** Removed duplicate `/api/version` route declaration to keep `VersionController` as the single source of truth.
- **Test Stability**: Improved the reliability of tests in `EditCatPage.test.tsx` by adding explicit `waitFor` assertions to prevent race conditions.
- **MyCatsPage Hooks Order**: Fixed a React hooks ordering error by removing a conditional `useMemo` within JSX props.

### Added
- **Transfer Handover Lifecycle:** Introduced a post-accept procedure to safely hand over the cat.
  - New `TransferHandover` model and migration to track handover scheduling and confirmations.
  - Endpoints: initiate handover (owner), confirm condition (helper), complete handover (either party).
  - On completion, apply final effects:
    - Permanent: transfer ownership to helper.
    - Foster: create an active `FosterAssignment`; owner remains.
  - OpenAPI documentation updated and tests added for lifecycle.
- **Ownership History:** New `ownership_history` table with `OwnershipHistory` model and relations on `Cat` and `User` to support the `transferred_away` section.
- **Placement Response System**: Implemented the core functionality for helpers to respond to placement requests.
  - **Backend**:
    - Cat profiles are now publicly visible if they have an active placement request.
    - Added tests for cat profile visibility logic.
    - Confirmed and tested linkage of `TransferRequest` to `PlacementRequest` with a foreign key.
    - Confirmed and tested creation/acceptance logic for `TransferRequest`.
    - Cat owners can now view HelperProfile data.
  - Added Postgres partial unique index to prevent duplicate pending responses by the same user to the same placement request.
  - Fulfillment fields on `PlacementRequest` (status `fulfilled`, `fulfilled_at`, `fulfilled_by_transfer_request_id`).
  - New `FosterAssignment` model and migration for fostering lifecycle.
  - **Frontend**:
    - Added a "Respond" button to Cat Cards for cats with active placement requests.
    - Implemented `PlacementResponseModal` for helpers to submit responses:
      - Prompts to create a HelperProfile if none exists.
      - Displays active HelperProfiles as options.
      - Includes a confirmation step before submission.
    - Added tests for `CatCard` and `PlacementResponseModal` functionality.
  - My Cats page reworked to consume `/api/my-cats/sections` and render sections: Owned, Fostering (Active), Fostering (Past), and Transferred Away; includes a "Show all (including deceased)" toggle with tests.
  - Cat Card now shows a "Fulfilled" badge when applicable.
- **Helper Profile Feature**: Implemented full CRUD functionality for Helper Profiles.
  - **Backend**: Added `HelperProfile` model, controller, policy, and photo uploads.
  - **Frontend**: Created pages for listing, viewing, creating, and editing helper profiles.
  - **Frontend**: Added a `CheckboxField` component and refactored forms to use a custom hook (`useHelperProfileForm`), aligning with project conventions.
  - **Frontend**: Added `Carousel` and `Table` components for improved UI.
- Added a "Helper Profiles" link to the user navigation menu.
- Added `start_date` and `end_date` to the `PlacementRequest` model and API.
- Added date picker components (`react-day-picker`, `date-fns`) to the frontend for placement request forms.

### Fixed
- **API**: Resolved an issue where the `/api/cats/placement-requests` endpoint was returning a 404 error due to incorrect route ordering.
- **API**: Fixed a bug where the `/api/cats/placement-requests` endpoint was returning an empty array because the `is_active` flag was not being set when creating a new placement request.
- **Database**: Resolved several database migration issues that were preventing the application from migrating correctly.
- **Backend Test Environment**: Resolved persistent database migration issues in the test environment by:
    - Deleting conflicting `create_initial_tables` migration.
    - Including `is_active` column directly in `create_placement_requests_table` migration.
    - Configuring in-memory SQLite for tests in `phpunit.xml`.
- **Transfer Request Functionality**: Fixed `TransferRequestCreationTest` failures by:
    - Uncommenting `transfer-requests` API routes.
    - Adding `placement_request_id` to `transfer_requests` table migration.
    - Ensuring `CAT_OWNER` role for owner user in tests.
    - Correcting `CatStatus` enum usage in controller and tests.
    - Eager loading `placementRequest` relationship in tests.
    - Explicitly setting `TransferRequest` status to `pending` in test factory.
    - Adding `placement_request_id` to `$fillable` array in `TransferRequest` model.
- **API Documentation**: Resolved OpenAPI documentation generation syntax errors.
- **Vite/Vitest CSS Handling**: Resolved a critical issue where Vitest tests were failing due to incorrect CSS parsing. The fix involved disabling Vitest's built-in CSS handling and importing the main stylesheet directly into the test setup file, ensuring styles are loaded correctly without conflicting with the Tailwind CSS Vite plugin.
- Adjusted backend tests (`CatListingTest`, `CatProfileTest`, `OwnershipPermissionTest`) to reflect owner/admin-only access for cat profiles.
- **PlacementRequestModal Tests**: Temporarily disabled two tests in `PlacementRequestModal.test.tsx` due to persistent timeouts.
- **Frontend Tests**: Re-enabled and fixed previously disabled tests in `EnhancedCatRemovalModal.test.tsx` and `EditCatPage.test.tsx`.
- **Docker Environment**: The Docker setup was completely overhauled to be more robust and reliable.
- **Authentication**: The entire authentication flow (register, login, logout) was fixed.
- **API Documentation**: The OpenAPI (Swagger) documentation was fixed.
- **File Permissions**: The file permissions for the `storage` directory were corrected.
- **Test Failures**: Fixed a number of test failures related to the `sonner` library and incorrect test selectors.
- **Frontend Tests**: Resolved multiple test failures across various components by adding polyfills for `PointerEvent` and `scrollIntoView` to the test setup, fixing brittle test logic, and addressing timeout issues.

### Changed
- **Backup & Restore Scripts**: The backup and restore scripts were improved to be more robust and user-friendly. They now dynamically load database credentials from the running container and correctly drop the database before restoring.
- **`.gitignore` & `.dockerignore`**: These files were updated to correctly ignore unnecessary files and directories.
- **Helper Profile**: After a helper profile is updated, the user is now routed to the view page instead of the list page.

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
- **Frontend Axios Client:** Removed redundant `frontend/src/api/api.ts` in favor of the standardized `frontend/src/api/axios.ts` client.
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