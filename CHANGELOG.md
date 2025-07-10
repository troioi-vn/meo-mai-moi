# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented login and registration scenarios, including:
  - Frontend: `LoginForm.tsx` and `RegisterForm.tsx` components, `LoginPage.tsx` and `RegisterPage.tsx` pages, and routing configuration.
- Added frontend tests for `LoginForm.tsx` and `RegisterForm.tsx` components using Vitest and React Testing Library.
- Successfully registered a user via the API.

### Fixed
- Enabled CORS for API routes by adding `HandleCors` middleware to the `api` middleware group in `bootstrap/app.php`.
- Updated frontend API calls in `LoginForm.tsx` and `RegisterForm.tsx` to use port `8080` instead of `8000` to match backend configuration.
- Corrected the namespace for `HandleCors` middleware in `bootstrap/app.php` to `Illuminate\Http\Middleware\HandleCors`.
- Implemented User Story 7: Fosterer Comments on Cat Profiles, including:
  - Backend: `CatComment` model, migration, controller (`CatCommentController`), and API routes (`GET /api/cats/{id}/comments`, `POST /api/cats/{id}/comments`).
- Implemented User Story 2: User Becomes a Helper, including:
  - Frontend: `ApplyToHelpPage.tsx` and `HelperApplicationForm.tsx`.
  - Frontend: `CommentsSection` component and integration into `CatProfilePage`.
- Added a "Development Setup" section to the `README.md` file with instructions for setting up and running the development server.
- Implemented a Hero Section component for the homepage.
- Implemented a basic homepage and frontend routing.
  - Implemented API endpoints for user reviews (`POST /api/reviews`, `GET /api/users/{id}/reviews`), now documented in Swagger.
  - Implemented User Story 3: Managing & Transferring Cat Custodianship, including:
    - Backend: `TransferRequest` model, migration, controller (`TransferRequestController`), and API endpoints (`POST /api/cats/{cat_id}/transfer-request`, `POST /api/transfer-requests/{id}/accept`, `POST /api/transfer-requests/{id}/reject`).
  - Created `HelperProfileFactory.php` and `TransferRequestFactory.php`.
- Implemented API endpoint for updating a cat's profile (`PUT /api/cats/{id}`), now documented in Swagger.
- Implemented API endpoint for adding medical records to a cat's profile (`POST /api/cats/{id}/medical-records`), now documented in Swagger.
- Implemented API endpoint for adding weight history to a cat's profile (`POST /api/cats/{id}/weight-history`), now documented in Swagger.
- Implemented API endpoints for managing cat custodianship transfer requests (`POST /api/cats/{cat_id}/transfer-request`, `POST /api/transfer-requests/{id}/accept`, `POST /api/transfer-requests/{id}/reject`), now documented in Swagger.
- Implemented API endpoint for retrieving authenticated user's helper profile status (`GET /api/helper-profiles/me`), now documented in Swagger.
- Implemented API endpoint for creating a new helper profile (`POST /api/helper-profiles`), now documented in Swagger.
- Implemented API endpoint for retrieving featured cat listings (`GET /api/cats/featured`), now documented in Swagger.
- Implemented API endpoint for retrieving a single cat's profile with dynamic viewer permissions (`GET /api/cats/{id}`), now documented in Swagger.
- Implemented API endpoint for retrieving all available cat listings (`GET /api/cats`), now documented in Swagger.
- Ran database migrations to create `users`, `cache`, `jobs`, and `cats` tables.
- Implemented API endpoint for creating new cat listings (`POST /api/cats`), now documented in Swagger.
- Implemented user profile management API endpoints (`GET /api/users/me`, `PUT /api/users/me`), now documented in Swagger.
- Added VitePress documentation setup and initial content.
- Set up a static site generator (`VitePress`) for the `docs/` directory.
- Installed and configured `l5-swagger` for the Laravel backend to handle OpenAPI documentation.
- Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend.
- Configured `PHP-CS-Fixer` for the Laravel backend to enforce PSR-12 coding standards.
- Initialized the React (Vite + TypeScript) project for the frontend SPA.
- Initialized the Laravel project for the backend API.
- Initial project setup.

### Changed
- Updated `GEMINI.md` with detailed frontend testing strategies, including principles, tools (Vitest, React Testing Library), and command examples.

### Deprecated

### Removed

### Fixed
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
