# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Fixed
- Resolved `502 Bad Gateway` error by correctly configuring PHP-FPM in `backend/docker/php-fpm.conf` with `user`, `group`, and `pm` directives.
- Resolved `CORS Missing Allow Origin` error by adding explicit CORS headers to `backend/nginx.conf` to handle preflight `OPTIONS` requests and allow `Access-Control-Allow-Origin`.
- Resolved "Unknown named parameter $except" error in `backend/bootstrap/app.php` by removing the problematic `except` parameter, allowing middleware to be managed per route or in `Kernel.php`.
- Addressed `422 Unprocessable Content` error during login, which was due to invalid credentials provided by the user, not a code issue.
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

## [Unreleased]

### Changed
- Updated `GEMINI.md` and `README.md` to reflect the use of Laravel Sail for backend development commands.
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
