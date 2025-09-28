# History

This file contains the changelog for older versions of the project.

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
