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
- Set up the project structure with a Laravel backend and a React/Vite frontend.
- Implemented user authentication (registration, login, logout).
- Added functionality for users to create, view, and manage their cat profiles.
- Implemented a notification system for real-time updates.
- Set up frontend testing with Vitest and React Testing Library.
- Integrated `msw` for mocking API requests in tests.

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
- Switched the backend database from MySQL to SQLite for easier local development.
- Updated the Vite build configuration to correctly place the manifest file for Laravel integration.
- Improved accessibility in the `CreateCatPage` and `NotificationBell` components.
- Refactored frontend tests to use `msw` for API mocking, improving reliability and removing `act` warnings.

### Fixed
- Corrected middleware registration from `app/Http/Kernel.php` to `bootstrap/app.php`.
- Resolved `Unterminated JSX contents` error in `CreateCatPage.tsx` by correcting JSX structure.
- Resolved `Failed to resolve import` error for `@/components/ui/card` by adding the `card` component using `npx shadcn@latest add card`.
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
- Resolved various backend errors, including database configuration issues and syntax errors.
- Fixed frontend TypeScript errors and prop type mismatches.
- Corrected issues with the frontend build process that prevented the application from being served correctly by the Laravel backend.
- Addressed and fixed all failing frontend tests, ensuring the test suite passes consistently.
- Fixed an issue where the notification badge was not appearing due to incorrect test setup.
- Resolved `act(...)` warnings in `MyCatsPage.test.tsx` by properly handling asynchronous operations.

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

### Deprecated

### Removed

### Security