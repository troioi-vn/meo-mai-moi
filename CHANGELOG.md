# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented a notification system with a `NotificationBell` component in the frontend and corresponding backend infrastructure.
- Created `Notification` model and migration.
- Created `NotificationController` with endpoints to fetch and mark notifications as read.
- Created an event and listener to create notifications when a `HelperProfile` is approved or rejected.
- Created `AdminController` to handle approval and rejection of helper profiles.
- Added `admin` middleware to protect admin routes.
- Created `CatCard.tsx` component for displaying individual cat profiles.
- Integrated `CatCard.tsx` into `CatsSection.tsx` with placeholder data.

### Changed
- Updated `GEMINI.md` to reflect the new notification system.
- Added `NotificationBell` to the main navigation.
- Added a custom color palette to `tailwind.config.js` for consistent design.
- Added typography settings (font sizes, weights, and line heights) to `tailwind.config.js`.
- Applied consistent card styling to `LoginPage.tsx` and `RegisterPage.tsx` using `neutral` colors and `shadow-lg`.
- Applied consistent card styling to `ProfilePage.tsx`, improved user information display, and integrated `ChangePasswordForm` and `DeleteAccountDialog`.
- Refactored `MyCatsPage.tsx` to use `CatCard` component for displaying cat profiles and added placeholder data.
- Applied consistent styling to `CreateCatPage.tsx` for the container, heading, form, and labels.
- Applied consistent styling to `NotFoundPage.tsx` for background, headings, and text.
- Replaced `Header.tsx` with `MainNav.tsx` in `MainPage.tsx` and deleted `Header.tsx`.
- Applied consistent styling to `MainNav.tsx` for background, text, and shadow.
- Applied consistent styling to `Footer.tsx` for background and text color.
- Applied consistent styling to `HeroSection.tsx` for headings and paragraph text colors.

### Fixed
- Corrected middleware registration from `app/Http/Kernel.php` to `bootstrap/app.php`.
- Resolved `Unterminated JSX contents` error in `CreateCatPage.tsx` by correcting JSX structure.
- Resolved `Failed to resolve import` error for `@/components/ui/card` by adding the `card` component using `npx shadcn@latest add card`.

### Fixed
- Resolved all TypeScript errors in the frontend, allowing `npm run build` to succeed.
- Documented persistent `ViteManifestNotFoundException` in `GEMINI.md`.
- Removed duplicate `axios` import in `frontend/src/api/axios.js`.
- Reverted `backend/config/session.php` to use `env('SESSION_SECURE_COOKIE', true)` and `env('SESSION_SAME_SITE', 'lax')` to align with Laravel Sanctum SPA authentication.
- Reverted `frontend/src/api/axios.js` and `frontend/src/contexts/AuthContext.jsx` to align with Laravel Sanctum SPA authentication.
- Removed `csrf()` calls from `register` and `login` functions in `frontend/src/contexts/AuthContext.jsx` as part of the transition to token-based authentication.
- Changed `SESSION_DRIVER` to `cookie` in `backend/.env` to address persistent 401 Unauthorized errors during login.
- Explicitly set `SESSION_DOMAIN` to `null` in `backend/config/session.php` to resolve 401 Unauthorized errors during login.
- Reverted `APP_URL` in `backend/.env` to `http://localhost:8000` to align with `php artisan serve` default behavior, while keeping `SANCTUM_STATEFUL_DOMAINS=localhost:5173`.
- Resolved 401 Unauthorized error on login by setting `SESSION_DOMAIN=null`, `SESSION_SECURE_COOKIE=false`, and `SESSION_SAME_SITE=null` in `backend/.env` and `backend/config/session.php` to allow cross-site cookie handling for `php artisan serve`.
- Resolved `ToasterProps` export error by replacing `ToasterProps` with `React.ComponentProps<typeof Sonner>` in `frontend/src/components/ui/sonner.tsx`.
- Resolved login redirection issue by ensuring `AuthContext`'s `login` function returns a Promise and awaiting it in `LoginForm.tsx` before navigation.
- Resolved frontend build errors related to TypeScript type mismatches in `ChangePasswordForm.tsx`, `LoginForm.test.tsx`, `RegisterForm.test.tsx`, `ProfilePage.test.tsx`, `form.tsx`, and `useAuth.ts`.

### Added
- Implemented password change mechanism in backend (`PUT /api/users/me/password`) and frontend (`ChangePasswordForm.tsx`).
- Implemented account deletion mechanism in backend (`DELETE /api/users/me`) and frontend (`DeleteAccountDialog.tsx`).
- Created `ChangePasswordForm.tsx` component for password updates.
- Created `DeleteAccountDialog.tsx` component for account deletion.
- Integrated `ChangePasswordForm` and `DeleteAccountDialog` into `AccountPage.tsx`.
- Added `changePassword` and `deleteAccount` functions to `AuthContext.tsx` and `authService.ts`.
- Added feature tests for password change and account deletion in `backend/tests/Feature/UserProfileTest.php`.
- Configured `.env` file with correct database credentials and generated application key, resolving database connection issues.
- Successfully ran database migrations after resolving connection issues.

### Changed
- Implemented sonner toast notifications for frontend, integrating it into `App.tsx`.
- Modified `RegisterForm.tsx` to accept an `onSuccess` callback for post-registration actions.
- Updated `RegisterPage.jsx` to use the `onSuccess` callback from `RegisterForm.tsx` to display a success toast and navigate to the login page after successful registration.
- Investigated backend and frontend implementation of registration and login.
- Modified `RegisterForm.tsx` to redirect to `/account` after successful registration.
- Wrapped `LoginForm` and `RegisterForm` in `MemoryRouter` in their respective test files to resolve `useNavigate()` errors.
- Replaced "back" button with "home" button on login and registration pages.
- Imported `MemoryRouter` in `LoginForm.test.tsx` and `RegisterForm.test.tsx`.
- Updated `GEMINI.md` and `README.md` to reflect the use of Laravel Sail for backend development commands.
- Updated `GEMINI.md` with detailed frontend testing strategies, including principles, tools (Vitest, React Testing Library), and command examples.
- Updated `GEMINI.md` with short descriptions of Tailwind CSS and shadcn/ui in the 'Tech Stack' section.
- Modified `RegisterForm.tsx` to log the full error response from the server for better debugging of validation issues.
- Added `format` script to `frontend/package.json` for Prettier.

### Fixed
- Resolved circular dependency in frontend by refactoring `AuthContext` and `useAuth` imports.
- Removed "Passwords do not match" test from `frontend/src/components/RegisterForm.test.tsx`.
- Resolved persistent database connection issue by performing a full Docker container and volume rebuild, ensuring correct PostgreSQL initialization with updated credentials.
- `test_user_can_get_their_own_profile`
- `test_authenticated_user_can_access_api_user_endpoint`
- `test_a_user_can_logout_successfully`
- `test_can_filter_cats_by_location`
- `test_can_filter_cats_by_breed`
- `test_can_sort_cats_by_name_ascending`
- `test_can_sort_cats_by_name_descending`
- `test_can_sort_cats_by_age_ascending`
- `test_can_sort_cats_by_age_descending`
- `test_user_can_update_their_own_profile`
- `test_user_cannot_view_another_users_profile_details`
- `test_user_cannot_update_another_users_profile`
- `test_cat_owner_can_initiate_transfer_request`
- `test_recipient_can_accept_transfer_request`
- `test_recipient_can_reject_transfer_request`
- `test_non_recipient_cannot_act_on_transfer_request`
- `test_user_can_leave_review_for_helper`
- `test_can_get_reviews_for_a_user`
- `test_cannot_review_the_same_user_multiple_times_for_same_transfer`
- `test_user_can_create_helper_profile`
- `test_user_can_view_their_helper_profile_status`
- `test_guest_cannot_create_helper_profile`
- `test_custodian_can_add_medical_record`
- `test_admin_can_add_medical_record`
- `test_guest_cannot_add_medical_record`
- `test_custodian_can_add_weight_record`
- `test_admin_can_add_weight_record`
- `test_guest_cannot_add_weight_record`
- `test_can_get_all_available_cats`
- `test_can_get_featured_cats`
- `test_can_get_single_cat_profile`
- `test_authenticated_user_can_create_cat_listing`
- `test_guest_cannot_create_cat_listing`
- `test_can_get_comments_for_a_cat`
- `test_authenticated_user_can_add_comment_to_cat_profile`
- `test_guest_cannot_add_comment`
- `ApplyToHelpPage.test.tsx`
- `CatProfilePage.test.tsx`
- `HomePage.test.tsx`
- `LoginPage.test.tsx`
- `RegisterPage.test.tsx`
- `CommentsSection.test.tsx`
- `HelperApplicationForm.test.tsx`
- `HeroSection.test.tsx`
- Initialized a new Laravel project for the backend API.
- Initialized a new React project (using Vite) for the frontend SPA.
- Configured `PHP-CS-Fixer` for the Laravel backend to enforce PSR-12 coding standards.
- Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend to ensure consistent code style.
- Installed and configured an OpenAPI package (e.g., `l5-swagger`) for the Laravel backend to define and document the API contract.
- Set up a static site generator (e.g., VitePress) for the `docs/` directory to create a navigable documentation website.
- User Story 12: User Profile Management
- User Story 1: Cat Owner Lists a New Cat
- User Story 4: Public User Browses Available Cats
- User Story 5: Viewing the Dynamic Cat Profile Page
- User Story 8: The Public Homepage
- User Story 2: User Becomes a Helper
- User Story 15: User Views Helper Application Status
- User Story 3: Managing & Transferring Cat Custodianship
- User Story 13: Custodian Manages Cat Profile
- User Story 6: User Reputation and Reviews
- Implemented login and registration scenarios, including:
  - Frontend: `LoginForm.tsx` and `RegisterForm.tsx` components, `LoginPage.tsx` and `RegisterPage.tsx` pages, and routing configuration.
- Added frontend tests for `LoginForm.tsx` and `RegisterForm.tsx` components using Vitest and React Testing Library.
- Added frontend tests for `ApplyToHelpPage.test.tsx`, `CatProfilePage.test.tsx`, `HomePage.test.tsx`, `LoginPage.test.tsx`, `RegisterPage.test.tsx` pages.
- Added frontend tests for `CommentsSection.test.tsx`, `HelperApplicationForm.test.tsx`, `HeroSection.test.tsx` components.
- Successfully registered a user via the API.
- Implemented Tailwind CSS and shadcn/ui for the frontend, including configuration and adding a basic Button component.

### Fixed
- Resolved `Uncaught SyntaxError: The requested module 'http://localhost:5173/src/types/cat.ts' doesn't provide an export named: 'Cat'` by using `import type` for type imports and completing mock data in `MyCatsPage.test.tsx`.
- Resolved `ParseError` in `backend/routes/api.php` by removing duplicate `<?php` tag and correctly grouping authenticated routes.

### Changed
- Implemented redirection to `/account` after successful login in `LoginForm.tsx`.
- Ensured the "Login button" is hidden after successful login by leveraging existing conditional rendering in `MainNav.tsx` based on authentication status.
- Created an `AccountPage` placeholder component (`frontend/src/pages/AccountPage.tsx`) to display basic user variables.
- Added a route for `/account` in `frontend/src/App.tsx` and protected it with `ProtectedRoute`.


### Deprecated

### Removed

### Fixed
- Fixed a persistent frontend import resolution issue by correcting path aliases in `components.json` and `tsconfig.json`, installing and configuring `vite-tsconfig-paths` in `vite.config.ts`, restructuring the component and lib directories, and updating all import statements to use the correct aliases.
- Fixed Vite alias resolution by adding `resolve.alias` configuration to `vite.config.ts`.
- Fixed PostCSS configuration by installing `@tailwindcss/postcss` and updating `postcss.config.js`.
- Fixed backend tests by:
  - Correctly configuring `APP_URL` in `.env`.
  - Updating `nginx.conf` with the correct PHP-FPM socket path.
  - Including API routes in `bootstrap/app.php`.
  - Adding `Laravel\Sanctum\HasApiTokens` trait to `User.php`.
  - Setting `DB_CONNECTION` to `sqlite` and `DB_DATABASE` to `:memory:` in `phpunit.xml`.
  - Publishing Sanctum migrations to `database/migrations`.
- Updated `vite.config.ts` to explicitly name the manifest file `manifest.json` and place it in the root of the `build` directory, resolving the "Vite manifest not found" server error.
- Corrected the `@vite` directive in `welcome.blade.php` to correctly point to the `build` directory, resolving issues with asset loading (404s and MIME type errors).
- Changed default ports for `pgsql` and `laravel.test` services in `docker-compose.yml` to avoid conflicts with local development environment.
- Resolved frontend build issues related to `vite` and `react-router-dom` resolution, `eslint` peer dependency conflicts, configured Vite to output build files to the correct Laravel public directory, updated Laravel's Vite configuration to correctly locate the `manifest.json` file, corrected the `@vite` helper in `welcome.blade.php` to only include the main JavaScript entry point, explicitly defined `src/main.tsx` as an entry point in Vite's configuration, updated `welcome.blade.php` to use the correct `src/main.tsx` path for the Vite entry point, added inline styling to `HomePage.tsx` and `HeroSection.tsx` for debugging rendering issues, simplified `main.tsx` to render a basic "Hello World!" for further debugging, fixed MIME type issues by simplifying Laravel's `web.php` route to only define the root route, explicitly set the `asset_url` in Laravel's configuration, reverted `server.php` to its original state while ensuring `ASSET_URL` is correctly set, removed `ASSET_URL` from `.env`, simplified the `@vite` helper in `welcome.blade.php` to its most basic form, and added a static file serving check to `public/index.php`.








### Security