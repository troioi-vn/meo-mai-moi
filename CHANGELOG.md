# 2025-07-18
## Frontend Test Refactor, MSW Handler Alignment, and CatPhotoManager Robustness

- Refactored all major frontend test files to use global MSW server, renderWithRouter, and centralized mock data utilities.
- Removed all local MSW server setups and decentralized mock data from test files.
- Centralized all cat/user mock data and handlers in `src/mocks/data/`.
- Updated all MSW handlers to match API response shapes and use only relative or absolute paths as required by the app and test environment.
- Fixed CatPhotoManager and related tests to assert navigation and toast side effects via mocks, not DOM.
- Ensured CatPhotoManager photo upload/delete handlers return `{ cat: ... }` at the top level, matching component expectations.
- Deleted legacy `handlers.js` to prevent shadowing/conflicts.
- Updated roadmap.md to reflect new PlacementRequest architecture and test refactoring progress.
- Updated and refactored all major page/component test files for robust, user-centric, and maintainable testing.
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Admin Panel**: Added global settings to admin panel, starting with SMTP mail server configuration.

- **Docker Optimization**: Improved Docker build performance with multi-stage builds and layer caching:
  - Implemented two-stage composer installation for better dependency caching
  - Added user context switching to avoid permission conflicts
  - Optimized Dockerfile with proper permission management
- **Admin Panel Enhancement**: Improved Filament admin panel setup:
  - Fixed 403 Forbidden errors by implementing `canAccessPanel` method in User model
  - Enhanced user model with `FilamentUser` contract for proper panel access control
  - Streamlined permission assignment for super_admin role
- **Database Management**: Enhanced database setup workflow:
  - Added `--force` flags to migration and seeding commands for production deployments
  - Integrated FilamentShield permission generation into setup process
  - Improved error handling for duplicate user creation during seeding
- **Content Security Policy**: Fixed Alpine.js compatibility issues:
  - Updated nginx CSP headers to include `'unsafe-eval'` for Alpine.js expression evaluation
  - Maintained security while enabling full admin panel functionality
- **Documentation**: Updated setup instructions with current working procedures:
  - Clarified post-build database setup steps
  - Added admin panel access credentials and URL
  - Updated Docker commands to use `docker compose` syntax

### Added (Previous)
- **Documentation**: Updated `roadmap.md` with new epics and tasks:
  - Medical Records Management (Track Cat Weight, Manage Vaccination Records)
  - Deployment & Demo Server (Prepare VPS, Deploy Demo Server)
  - Internationalization (Multilanguage Support, Language Selector)
- **Documentation**: Added admin panel access instructions and default credentials to `README.md`.

### Added
- **Backend**: Implemented Filament Admin Panel:
  - Installed and configured `filament/filament`.
  - Integrated `bezhansalleh/filament-shield` for role and permission management.
  - Configured `tomatophp/filament-users` for user management with Shield integration and impersonation.
- **Backend**: Implemented cat photo management with automatic resizing:
  - Integrated `intervention/image` library for image manipulation.
  - Updated `FileUploadService` to resize uploaded cat photos to 1200x675 pixels.
  - Enforced a "one photo per cat" rule by deleting the old photo on new upload.
  - Implemented `CatPhotoController` to handle photo uploads and deletions.
  - Added `CatPolicy` for authorization, ensuring only owners or admins can manage photos.
- **Testing**: Added comprehensive feature tests for cat photo management:
  - Verified successful photo upload and resizing by cat owners.
  - Confirmed old photos are replaced upon new uploads.
  - Ensured unauthorized users (non-owners, guests) cannot upload or delete photos.
  - Validated proper error handling for invalid file types/sizes.
  - Confirmed physical file deletion from storage upon photo removal.
- **Feature**: Enhanced Cat Removal - Multi-step process for safe cat profile management:
  - **Backend**: Created password verification endpoint (`POST /api/auth/verify-password`) for secure action confirmation
  - **Backend**: Enhanced delete endpoint to support marking cats as 'deceased' as an alternative to permanent deletion
  - **Frontend**: Implemented comprehensive 3-step cat removal modal (`EnhancedCatRemovalModal.tsx`):
    - Step 1: Name confirmation to prevent accidental deletion
    - Step 2: Choice between permanent deletion or marking as deceased
    - Step 3: Password verification for security
  - **Frontend**: Added toggle switch on "My Cats" page to show/hide deceased cats
  - **Backend**: Updated cat listing endpoints to filter out deceased cats by default
- **Testing**: Comprehensive test suite improvements with 100% coverage for new features:
  - Created complete test suite for `Switch` component with 7 comprehensive tests
  - Added `EnhancedCatRemovalModal` tests covering all 3 steps and user interactions
  - Enhanced `MyCatsPage` tests with deceased cats filtering functionality
  - Fixed 10 failing frontend tests across multiple components
  - Improved test reliability with proper async handling and user event simulation
- **UI/UX**: Enhanced deceased cats management:
  - **Frontend**: Switch component with improved visual contrast (gray-300/blue-600 colors)
  - **Frontend**: Centered toggle switch below cat cards with smaller, more elegant design
  - **Backend**: `dead` status support in Cat model and filtering logic
- **Testing**: Comprehensive backend test coverage for new authentication and permission features:
  - Created `OptionalAuthMiddlewareTest.php` with 6 tests covering valid tokens, no tokens, invalid tokens, malformed headers, expired tokens, and context preservation
  - Created `OwnershipPermissionTest.php` with 9 tests for ownership-based permission logic across different user roles and scenarios
  - Extended `CatProfileTest.php` with 7 additional tests for show endpoint with viewer permissions
- **Testing**: Enhanced frontend test coverage for conditional rendering and routing:
  - Extended `CatProfilePage.test.tsx` with 4 new tests for conditional button rendering based on viewer permissions
  - Created comprehensive `App.routing.test.tsx` with 9 tests covering route functionality, deep linking, parameter handling, and accessibility
  - Verified existing `CatCard.test.tsx` properly covers "View profile" link functionality
- **Backend**: Created `OptionalAuth` middleware for routes that work with both authenticated and non-authenticated users.
- **Backend**: Added optional authentication to cat profile endpoints (`/api/cats/{id}`).
- **Frontend**: Added edit and "My Cats" buttons to cat profile pages for cat owners.
- **Frontend**: Enhanced cat profile navigation with conditional owner buttons.
- **Backend**: Added `Message` model and migration.
- **Backend**: Implemented `MessageController` with `store`, `index`, `show`, `markAsRead`, and `destroy` methods.
- **Backend**: Added API routes for messaging.
- **Backend**: Added `cat_photos` table migration.
- **Backend**: Added `CatPhoto` model.
- **Backend**: Added `photos()` relationship to `Cat` model.
- **Backend**: Added `uploadCatPhoto` method to `FileUploadService`.
- **Backend**: Added `CatPhotoController` with `store` and `destroy` methods for cat photo management.
- **Backend**: Added API routes for cat photo upload and deletion.
- **Backend**: Added `avatar_url` column to `users` table.
- **Backend**: Implemented `FileUploadService` for handling file uploads.
- **Backend**: Added `uploadAvatar` and `deleteAvatar` methods to `UserProfileController`.
- **Backend**: Added API routes for user avatar upload and deletion.
- **Backend**: Completed API documentation for all existing endpoints with Swagger (OpenAPI) annotations.
- **Backend**: Implemented API Contract Testing for documentation freshness.
- **Documentation**: Added user stories for avatar management, cat profile deletion, and cat photo management to `GEMINI.md`.
- **Documentation**: Added new testing TODOs for `UserAvatar.tsx`, `MyCatsPage.tsx`, and `EditCatPage.tsx`.
- **Frontend**: Added local placeholder image for cats.
- **Frontend**: Enhanced `UserAvatar` component to display default placeholder image when no user avatar is uploaded.
- **Frontend**: Added `build:docker` script for Docker-specific builds without local file copying.
- **Deployment**: Updated Dockerfile to use `npm run build:docker` for cleaner container builds.

### Changed
- **Backend**: Updated cat permission logic to be ownership-based rather than role-based for better user experience.
- **Backend**: Modified `CatController@show` to allow any cat owner to edit their cats, regardless of user role.
- **Frontend**: Improved cat profile page navigation with cleaner "Back" button and conditional owner actions.
- **Frontend**: Updated `Cat` type to include `viewer_permissions` for proper frontend permission handling.
- **Frontend**: Refactored cat profile page buttons from single "Back to Cats" to "Back", "Edit", and "My Cats" for owners.
- **Backend**: `HelperProfileController` `index` method now supports filtering and sorting helper offers.
- **Backend**: `Cat` model updated: `age` replaced with `birthday`, and `status` field added.
- **Backend**: `TransferRequest` model updated: `fostering_type` and `price` fields added.
- **Backend**: `CatController` updated to use `birthday` instead of `age` for validation and sorting.
- **Backend**: `TransferRequestController`'s `store` method updated to handle new fields and authorization.
- **Backend**: Added `localhost:5173` to `SANCTUM_STATEFUL_DOMAINS` in `config/sanctum.php`.
- **Documentation**: Updated `Cat` model in `GEMINI.md` to use `birthday` instead of `age`.
- **Documentation**: Updated "Create and Edit a Cat Profile" user story to reflect the `birthday` change and frontend age calculation.
- **Frontend**: Re-implemented a custom theme provider, removing the `next-themes` dependency.
- **Frontend**: Updated numerous components with consistent styling from the new design system in Tailwind CSS.
- **Frontend**: Simplified CSRF function in `src/api/axios.ts`.
- **Frontend**: Updated `tsconfig.app.json` and `tsconfig.node.json` to include `composite: true`.
- **Frontend**: Updated `npm run build` script to properly copy build files to backend directory for local Laravel serving.
- **Frontend**: Modified Vite config to output to `dist` directory consistently across environments.
- **Tests**: `CatListingTest` updated to use `birthday` and dynamic sorting assertions.
- **Tests**: `TransferRequestTest` updated to reflect new API and authorization.

### Fixed
- **Frontend**: Fixed 404 error when clicking "View Profile" on cat cards by adding missing `/cats/:id` route.
- **Backend**: Fixed authentication issue on public cat profile routes that prevented edit buttons from showing for owners.
- **Frontend**: Fixed edit button visibility on cat profile pages for authenticated cat owners.

### Removed
- **Frontend**: Removed `next-themes` library.
- **Frontend**: Deleted `DropdownMenuTest.tsx`, `HomePage.tsx`, and `HomePage.test.tsx`.

### Fixed
- **Testing**: Fixed critical enum comparison bug in `CatController@show` where admin permissions were not working due to comparing `UserRole` enum instances with string values instead of enum constants
- **Frontend**: Fixed 404 error when clicking "View Profile" on cat cards by adding missing `/cats/:id` route.
- **Backend**: Fixed authentication issue on public cat profile routes that prevented edit buttons from showing for owners.
- **Frontend**: Fixed edit button visibility on cat profile pages for authenticated cat owners.
- **Backend**: Added authorization to `CatController@destroy` to ensure only owners or admins can delete cat profiles.
- **Backend**: Ensured `HelperProfileStatusUpdated` event is dispatched in `AdminController` for notification.
- **Frontend**: Fixed build process issue where `npm run build` wasn't properly updating Laravel-served version on localhost:8000.
- **Deployment**: Fixed Vite configuration inconsistency between local development and Docker builds.
- Frontend: Fixed all failing frontend tests to properly match component implementations:
  - Updated `Footer.test.tsx` to test actual footer structure instead of removed social media icons
  - Fixed `MainPage.test.tsx` to correctly identify navigation elements (DropdownMenuTest component)
  - Corrected `MyCatsPage.test.tsx` loading and error message text to match actual component output
  - Updated button/link expectations in `MyCatsPage.test.tsx` to match actual UI implementation
  - All 18 frontend tests now pass successfully
- **Backend**: Fixed Laravel storage symbolic link configuration to properly serve uploaded avatar files.
- **Backend**: Updated `nginx-docker.conf` to include `/storage/` location block for serving user-uploaded files.
- **Backend**: Added `php artisan storage:link` command to Dockerfile for proper file serving in production.
- **Frontend**: Fixed default avatar placeholder loading in `UserAvatar` component by using hardcoded asset path instead of Vite import.
- **Frontend**: Fixed default avatar placeholder loading in `UserMenu` component to display properly when no user avatar is uploaded.
- **Deployment**: Fixed avatar file serving configuration to work correctly in both development and Docker environments.

## [0.3.0] - 2025-07-15

### Added
- Frontend: Added new `auth-context.tsx` file to separate context definition from provider implementation.
- Frontend: Added comprehensive error logging in registration form for better debugging.

### Changed
- Frontend: Refactored authentication architecture for better separation of concerns:
  - Moved context definition to separate file (`auth-context.tsx`)
  - Updated `AuthContext` to use `useCallback` for all functions to prevent unnecessary re-renders
  - Standardized type imports across auth-related files
- Frontend: Improved error handling consistency across forms:
  - Enhanced `ChangePasswordForm` with proper `AxiosError` type checking and fallback error messages
  - Updated `DeleteAccountDialog` to use consistent error handling pattern
  - Improved `RegisterForm` error processing and type safety
- Frontend: Enhanced component implementations:
  - Updated `LoginForm` to properly handle async form submission with `void` operator
  - Modified `UserMenu` to use proper promise handling for `logout` function
  - Updated `MainNav` to use the new `useAuth` hook import path
- Frontend: Improved UI component architecture:
  - Refactored `alert-dialog.tsx` to use proper `React.forwardRef` implementation
  - Updated `button.tsx` to use cleaner interface definitions and import structure
  - Enhanced `form.tsx` with better context handling and error message processing
  - Improved `input.tsx` with proper TypeScript interface exports
- Frontend: Updated page components for better UX:
  - Removed `HomeButton` component from `LoginPage` and `RegisterPage` for cleaner design
  - Enhanced `ProfilePage` to use direct function references instead of arrow functions
  - Updated `CreateCatPage` to use proper promise chaining instead of async/await in event handlers
- Frontend: Improved test infrastructure:
  - Updated `NotificationBell.test.tsx` with proper API mocking using `vi.spyOn`
  - Enhanced `TestAuthProvider` to use `useMemo` for better performance
  - Fixed test imports to use the new hook location
- Frontend: Configuration improvements:
  - Updated `tsconfig.json` to explicitly include the new `auth-context.tsx` file

### Removed
- Frontend: Removed the unused `HomeButton` component and all its references.

### Fixed
- **Linting:** Resolved majority of ESLint errors including:
  - Fixed `@typescript-eslint/no-floating-promises` errors by using proper promise handling
  - Resolved `@typescript-eslint/no-unsafe-call` and `@typescript-eslint/no-unsafe-assignment` errors
  - Fixed `@typescript-eslint/no-unnecessary-condition` errors with proper type checking
  - Resolved `@typescript-eslint/prefer-nullish-coalescing` errors by using `??` operator
- **Type Safety:** Enhanced TypeScript usage across components:
  - Proper `AxiosError` type checking in error handlers
  - Improved interface definitions and type exports
  - Better error message type handling
- **React Best Practices:** Improved component implementations:
  - Proper `React.forwardRef` usage in UI components
  - Better hook usage with `useCallback` and `useMemo` for performance
  - Consistent promise handling patterns
- **Note:** Some React 19 warnings remain for `forwardRef` usage and context providers, which are acceptable for current shadcn/ui components

## [0.2.0] - 2025-07-15

### Added
- Backend: Added `cats()` relationship to `User` model.
- Frontend: Added `postcss.config.js` for Tailwind CSS and Autoprefixer.
- Frontend: Created `badge-variants.ts` and `button-variants.ts` for React Fast Refresh compatibility.

### Changed
- Backend: Refactored `CatController` authorization to use manual checks instead of `authorizeResource`.
- Backend: Updated `Controller.php` to use `AuthorizesRequests` and `ValidatesRequests` traits.
- Frontend: Standardized import statements to use single quotes (`'`).
- Frontend: Updated `App.tsx` for styling and `pt-16` comment.
- Frontend: Modified `api.ts` to use `|| '/api'` for `baseURL`.
- Frontend: Improved error handling and type safety in `axios.ts` interceptor.
- Frontend: Updated styling and structure in `CatCard.tsx`, `CatsSection.tsx`, `HeroSection.tsx`, `LoginPage.tsx`, `MainPage.tsx`, `NotFoundPage.tsx`, `ProfilePage.tsx`, `RegisterPage.tsx`, `CreateCatPage.tsx`, and `MyCatsPage.tsx`.
- Frontend: Refactored `ChangePasswordForm.tsx` for improved error handling and Zod schema.
- Frontend: Added `await` to `logout()` in `DeleteAccountDialog.tsx`.
- Frontend: Updated `LoginForm.tsx` to handle `handleSubmit` with `void`.
- Frontend: Added `p-2` padding to header in `MainNav.tsx`.
- Frontend: Updated `NotificationBell.test.tsx` and `NotificationBell.tsx` for improved mocking and `useEffect` logic.
- Frontend: Updated `RegisterForm.tsx` for improved error logging.
- Frontend: Refactored `UserMenu.tsx` for dark mode toggling, updated avatar attributes, and removed unused import/link.
- Frontend: Simplified `Avatar`, `AvatarImage`, and `AvatarFallback` components in `avatar.tsx`.
- Frontend: Refactored `Card` components in `card.tsx`.
- Frontend: Removed hardcoded background colors from `DropdownMenuContent` and `DropdownMenuSubContent` in `dropdown-menu.tsx`.
- Frontend: Updated context creation and component structure in `form.tsx`.
- Frontend: Refactored `Input` component in `input.tsx` to use `React.forwardRef`.
- Frontend: Updated `Label` component in `label.tsx`.
- Frontend: Updated theme variables in `sonner.tsx`.
- Frontend: Updated `Toast` components in `toast.tsx`.
- Frontend: Added block scope to `DISMISS_TOAST` case in `use-toast.ts`.
- Frontend: Added `RegisterPayload` and `LoginPayload` interfaces in `AuthContext.tsx`.
- Frontend: Updated `TestAuthProvider.tsx` for mock values.
- Frontend: Updated dark mode color definitions in `index.css`.
- Frontend: Updated `tsconfig.json` and `vite.config.ts` for paths and imports.
- Frontend: Updated `package-lock.json` and `package.json` dependencies.

### Removed
- Backend: Removed `__construct` with `authorizeResource` from `CatController.php`.
- Frontend: Removed social media icon buttons from `Footer.tsx` due to deprecation warnings.
- Frontend: Removed "About" link from `UserMenu.tsx`.
- Frontend: Removed `DropdownMenuLabel` import from `UserMenu.tsx`.
- Frontend: Removed `type VariantProps` from `button.tsx` import.
- Frontend: Removed the unused `HomeButton` component.

### Fixed
- **General:** Addressed numerous ESLint errors across the frontend, including `no-floating-promises`, `no-unsafe-call`, `no-unnecessary-condition`, and `no-misused-promises`, leading to more stable and type-safe code.
- **Ref Forwarding:** Corrected the implementation of `React.forwardRef` in several `shadcn/ui` components (`alert-dialog.tsx`, `input.tsx`) to resolve React 19 warnings.
- **Fast Refresh:** Fixed `react-refresh/only-export-components` errors by isolating non-component exports (e.g., `buttonVariants`, form contexts) into their own files.
- **Error Handling:** Standardized and improved error handling in forms (`ChangePasswordForm`, `RegisterForm`) and dialogs (`DeleteAccountDialog`) to be more robust.
- **Promise Handling:** Correctly handled promises in various components (`LoginForm`, `CreateCatPage`, `UserMenu`) to prevent unhandled promise rejections.
- **Imports & Modules:** Corrected the import path for `useAuth` hook and `buttonVariants` across multiple components.
- **Configuration:** Updated `frontend/tsconfig.json` to correctly include all necessary files, resolving a persistent parsing error.
- **Testing:** Repaired broken tests (`NotificationBell.test.tsx`, `LoginPage.test.tsx`, etc.) by mocking dependencies correctly and updating providers.
- **UI/UX:** Removed the now-redundant `HomeButton` from login and registration pages.

### Refactored
- Improved frontend code structure by separating auth context, hooks, and types into their own files for better maintainability.
- Standardized promise handling and error catching across several React components.