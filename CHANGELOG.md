# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **i18n Translation Maintenance Suite**: Introduced professional tooling to proactively find and manage unused translation keys in the codebase.
  - **REPLACED** custom wheel-reinvention scripts (`find-unused-translations.cjs`, `remove-unused-translations.cjs`, `clean-unused-translations.cjs`) with professional `@lingual/i18n-check` tool for better reliability and maintenance.
  - **FIXED** import issue in `useLocaleSync.ts` (changed from `'./useAuth'` to `'./use-auth'`).
  - **CLEANED** duplicate `check_form` keys from translation files.
  - **RENAMED** `clean-translation-placeholders.js` to `.cjs` for consistency.
  - Added npm scripts `i18n:unused`, `i18n:missing`, `i18n:check`, and `i18n:clean-placeholders` to [frontend/package.json](frontend/package.json).
  - **DOCUMENTED** `i18next-scanner` TypeScript parsing limitations: The scanner cannot parse modern TypeScript syntax (interfaces, type annotations, complex destructuring) and shows parsing errors for most `.tsx` files. Updated documentation to recommend manual key management and alternative approaches until scanner compatibility improves.
  - Comprehensive documentation in [docs/i18n.md](docs/i18n.md) covering best practices for translation maintenance and current tooling limitations.

- **i18n Testing Best Practices Enforcement**: Standardized i18n testing patterns across all modified test files (30+ tests) to ensure consistent and robust internationalization coverage.
  - Unified render approach: All tests now use `renderWithRouter()` helper from `@/testing` instead of custom render functions, ensuring proper i18n provider wrapping via `AllTheProviders`.
  - Removed hardcoded English string assertions: Replaced exact string matching with i18n-aware assertions that verify element presence without hardcoding translations.
  - Eliminated missing i18n provider wrappers: Fixed test files that bypassed i18n context through custom `BrowserRouter`/`QueryClientProvider` combinations.
  - Improved test resilience: Tests now properly validate i18n-translated content and are immune to translation string changes.
  - Files updated: LoginForm, LoginPage, UserAvatar, NotificationPreferences, UserMenu, ForgotPasswordPage, HelperProfileEditPage, CreatePetPage, MyPetsPage, EditPetPage, and 20+ others.

- **PWA Install Banner**: Added a progressive web app install banner that appears on mobile devices after user authentication, allowing users to install the app to their home screen for quick access. Includes smart detection of mobile devices, respect for user dismissal preferences (30-day cooldown), and integration with the browser's `beforeinstallprompt` event.

- **Full-stack Type Safety via Orval** (Completed): Integrated Orval to automatically generate TypeScript API clients and React Query hooks from the backend's OpenAPI specification.
  - Automated stripping of `/api` prefix and unwrapping of `{ data: T }` envelope at the type level for optimal DX.
  - Added `api:generate`, `api:check`, and `api:watch` scripts to [frontend/package.json](frontend/package.json).
  - Integrated with custom Axios mutator to maintain centralized 401 handling and standardized envelope extraction.
  - Completed OpenAPI spec coverage for **Cities**, **Messaging/Chats**, **Push Subscriptions**, and **Notification Actions** by adding PHP attributes to backend controllers.
  - Migrated all eligible API modules to use generated typesafe hooks including impersonation, user avatars, pet photos, helper profiles, and placement request responses.
  - Resolved request body mapping issues (Orval `body` vs Axios `data`) by switching to `httpClient: 'axios'`.
  - Fixed an inconsistency in the Orval mutator where response data was being incorrectly re-wrapped, ensuring runtime behavior matches generated TypeScript definitions.
  - Added pre-build API generation check in `utils/deploy.sh` to catch OpenAPI spec drift early during deployment.

- **API Standardization Framework**: Implemented a unified JSON response envelope `{ success, data, message, error }` across all backend controllers. This includes a robust `ApiResponseTrait` for consistent output and centralized OpenAPI schema definitions in `ResponseSchemas.php`.

- **Photo Upload System for Health Records**: Replaced the basic attachment URL system with a comprehensive photo upload feature for medical and vaccination records using Spatie Media Library.
  - Medical records now support multiple photo uploads with automatic thumbnail and medium size generation.
  - Vaccination records support single photo uploads with thumbnail generation.
  - Added confirmation dialogs before deleting photos to prevent accidental removal.
  - Implemented photo carousel modal for viewing multiple medical record photos.
  - Updated API endpoints to handle multipart/form-data uploads and photo deletion.
  - Removed `attachment_url` field from medical records and added database migration to drop the column.

- **Frontend Hook Tests**: Added comprehensive unit tests for React hooks to improve code reliability and catch regressions early. Implemented tests for CRUD operations in `useMedicalRecords`, `useVaccinations`, `useMicrochips`, and `useWeights`; business logic in `usePlacementInfo` and `usePetProfile`; side effects in `useCreatePlacementRequest` and `use-pwa-update`; and form validation/payload building in `useCreatePetForm` and `useHelperProfileForm`. Refactored form hooks to extract pure helper functions for better testability. Fixed Sonner toast mock to support both callable and method forms.

- **i18n Implementation for Helper Profile Creation**: Completed internationalization for the helper profile creation page and related components to support both English and Russian locales.
  - Localized all hardcoded strings on the helper/create page including section headers ("Pet Preferences", "Photos"), form labels, placeholders, and button text.
  - Enhanced `CountrySelect` and `CitySelect` components with full i18n support, including Russian country names via `i18n-iso-countries` library and localized search placeholders, validation messages, and empty states.
  - Added comprehensive translation keys to `common.json`, `helper.json`, and `placement.json` for both English and Russian locales.
  - Updated `HelperProfilePlacementRequestsCard` to use localized status labels and badges.
  - Fixed test regressions by updating assertions to match new localized strings and resolved initialization order issues in `NotificationPreferences` component.

### Changed

- **Frontend API Consumption**: Updated the Axios interceptor to automatically "unwrap" the backend's data envelope. Components now receive the direct payload (e.g., as `const user = await api.get('/user')`) instead of having to manually navigate `.data.data`.
- **Admin User Ban Feature**: Added ability for admins to ban users, putting them into read-only mode. Banned users can view content but cannot perform write actions (posting, editing, messaging). Includes database fields (`is_banned`, `banned_at`, `ban_reason`), middleware enforcement, Filament admin UI actions, and frontend read-only banner. Admins cannot ban other admins.

- **Real-time Type Safety**: Added custom TypeScript definitions for `laravel-echo` and integrated `@types/pusher-js` to improve developer experience and catch potential errors in messaging and notification hooks.

### Changed

- **Notification Actions System**: Implemented actionable buttons on notifications, allowing users to perform actions directly from notification items (e.g., unapproving cities). Includes a handler registry system for extensible action definitions and confirmation dialogs for destructive actions.

- **City Creation Notifications**: Cities are now auto-approved upon creation, and notifications are sent to all admin users for review. Added rate limiting of 10 cities per user per 24 hours to prevent abuse.

- **Invitations page (tests)**: Added unit tests for the Invitations page to cover stats card rendering and behaviors (including revoked card visibility and numeric alignment).

### Changed

- **Deployment Script**: Modified `utils/deploy.sh` to stop containers before building in development environment (`APP_ENV=development`) to reduce peak memory usage and prevent out-of-memory failures. Production and staging environments retain the existing behavior of building while services are running to minimize downtime.

- **Backup and Deployment Scripts**: Enhanced `utils/backup.sh` with separate handling for database and uploads backups, improved error handling, and new command-line options. Updated `utils/deploy.sh` with restore options (`--restore`, `--restore-db`, `--restore-uploads`) and auto-backup functionality (`--auto-backup`). Deprecated `utils/restore.sh` in favor of the improved backup script.

- **Pet Profile Creation/Editing**: Made the City field optional when creating or editing pet profiles (`/pets/create` and `/pets/{id}/edit`).

- **Notification Model**: Improved synchronization logic for `read_at` and `is_read` fields to prefer `read_at` as the canonical source and handle updates more reliably.

- **City Creation Success Message**: Updated success toast from "City created (pending approval)" to "City created" since cities are now auto-approved.

- **Invitations page (UI)**: Made the invitations stats cards more compact and improved responsive layout; numeric counters are now left-aligned and use tabular numerals for better readability. The "Revoked" stats card is hidden when its value is zero to avoid showing empty/placeholder stats.

- **Medical Record Types**: Changed `record_type` field from predefined enum to free-form text input, allowing users to enter custom medical record types while maintaining predefined suggestions in the frontend. Removed database check constraint and updated API validation to accept any string up to 100 characters.

### Fixed

- **Emoji Initials in Chat and Avatars**: Fixed broken initials display when user names contain multi-character emojis (e.g., flags, family emojis) in chat list, chat windows, message bubbles, and user avatars. Implemented grapheme-aware initials generation using `Intl.Segmenter` with a fallback to `grapheme-splitter` library. Added comprehensive unit tests for emoji handling.

- **Database Seeders**: Updated `DatabaseSeeder` to create placement requests for all seeded pets (excluding birds), and implemented `PlacementRequestSeeder` as an idempotent seeder to backfill placement requests for existing cats and dogs in the database.

- **Database Seeders and Factories**: Updated factories and seeders to be compatible with recent database schema changes, including new fields like `city_id`, `is_read`, and `status`, and improved business logic for placement requests. Enhanced E2E testing seeder to include essential seeders for complete test data setup.

- **Docker Backend Setup**: Fixed missing Laravel `storage/framework/cache` directories in Docker container, preventing `file_put_contents` errors on Livewire requests by ensuring cache directories are created during both image build and container startup.

- **Impersonation UI**: Fixed avatar and main menu visibility during impersonation. Redesigned the impersonation banner to be more compact, showing "🕵 [user_name] x" instead of the longer text. Ensured the admin panel link remains visible to impersonating admins even when checking the impersonated user's permissions.

- **Test Suite Fixes**: Resolved all import-related test failures (15 test suites) caused by the Orval API migration by updating imports to use generated APIs and adjusting function signatures. Fixed runtime assertion failures in messaging tests related to unexpected data structures.

### Changed

- **API Response Handling**: Enhanced Axios interceptors with proper TypeScript types and improved API envelope unwrapping logic for consistent data handling across the frontend.
- **Type Safety Improvements**: Added comprehensive TypeScript definitions for Axios instance methods and improved null safety checks using nullish coalescing operators.
- **Code Consistency**: Standardized quote usage and removed unused imports to maintain consistent code style throughout the frontend codebase.
- **Authentication Flow**: Updated public path handling to include requests page in unauthorized redirect logic.
- **Authorization and Permissions**: Refactored permissions from "cat" to "pet" to generalize the application. Expanded admin role permissions to include pet types, helper profiles, placement/transfer requests, and reviews. Added create permissions for placement and transfer requests. Implemented Gate::before callback to implicitly grant all permissions to super_admin role.

### Added

- **Vaccination Form Enhancements**: Added autocomplete datalist with common vaccination types (Rabies, FVRCP, FeLV, etc.) to improve user experience when entering vaccine names in the vaccination form.

### Changed

- **Helper Profile Form Hook**: Refactored `useHelperProfileForm` to use render-time synchronization instead of `useEffect` for better performance and cleaner code structure.

### Fixed

- **Placeholder Text Consistency**: Standardized placeholder text in vaccination forms by removing unnecessary commas (e.g., "e.g., Rabies" → "e.g. Rabies").
- **Dialog Focus Management**: Added `outline-none` class to dialog components for better focus accessibility.
- **Popover Directive**: Removed unnecessary `"use client"` directive from popover component.
- **Messaging Hook Type Safety**: Fixed type casting in `useMessaging` hook for better TypeScript compliance when creating direct chats.
