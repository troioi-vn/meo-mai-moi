# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- SPA catch‑all web route: serve the React app for all non‑API/non‑admin paths, preserving path and query. When same‑origin, return `welcome` directly; otherwise, external redirect to `FRONTEND_URL`.

### Fixed

- Email verification flow now completes entirely via the link: user is auto‑logged in and redirected to the SPA at `/account/pets?verified=1` (uses external redirects to the frontend to avoid backend 404s on SPA routes).
- SPA 404 after verification redirect resolved by the catch‑all route and using `redirect()->away(...)` for verification redirects.
- Email Logs show a readable plain‑text body for verification emails (includes greeting, link, and expiry) instead of raw HTML. Other emails continue logging rendered HTML.

### Changed

- Removed the “Verify your email” reminder from the bell notifications (filtered out `email_verification` type in notifications API).

### Fixed (auth/spa)

- Avoid redirect loops on `/login` and `/register`: when `FRONTEND_URL` is same-origin as the backend, serve the SPA index so the React router handles the route; otherwise 302 redirect to the frontend.
- Password reset web route now consistently redirects to the SPA and builds URLs using `FRONTEND_URL` with a robust fallback to `env('FRONTEND_URL')` (or `http://localhost:5173` in dev).
- `/api/check-email` consistently returns `{ exists: boolean }` and is throttled+audit-logged.

### Changed

- Fortify registration/login hardening: removed manual session login in `CreateNewUser`; simplified `RegisterResponse` to SPA-friendly JSON only.
- Verified flow: retained custom `verified` alias to preserve JSON error structure; added lean API verification alias for JSON clients/tests.
- Email pipeline resilience: `SendNotificationEmail` no longer throws when email isn’t configured; it logs, marks the notification failed, and creates an in-app fallback instead (prevents 500s during registration).
- Settings cache: `Settings::set()` performs a write-through cache update per key for immediate reads.
- Deployment safety & observability improvements:
  - `utils/deploy.sh` now supports a quiet mode that still streams long-running Docker and Artisan output, plus pre/post DB snapshots that log total users and the status of the watched admin account.
  - Added interactive prompts to rebuild core users via `UserSeeder` when the admin account is missing, and automatic logging of the Postgres volume creation timestamp to detect unexpected resets.
  - Backup prompt restored with resilience fixes; targeted seeder, snapshot, and volume details are captured in both console and `.deploy.log` for easier incident investigation.

### Fixed

- **🔥 CRITICAL: Authentication Test Suite - 100% Pass Rate Achieved**:

  - **Test Fixes (15 failing tests → 0 failures)**: Fixed all authentication-related test failures after cookie-based auth migration
  - **ForceWebGuard Middleware Issue**: Discovered and resolved authentication persistence bug where `ForceWebGuard` was re-authenticating users after logout by mirroring Sanctum guard state to web guard
  - **Test Pattern Cleanup**: Removed obsolete dual-driver test patterns (`runApiContractTestWithBothDrivers`, `runEmailFlowTestWithBothDrivers`, `runEmailVerificationTestWithBothDrivers`) from pre-migration code
  - **Bearer Token → Cookie Auth Conversion**: Updated `EmailVerificationFlowTest` from bearer token authentication to cookie-based session auth
  - **Registration Response Structure**: Fixed `RegisterResponse` to return explicit user field mapping (id, name, email, email_verified_at) instead of full serialized User object
  - **API Route Fixes**: Corrected Fortify route paths (`/api/forgot-password` → `/forgot-password`, `/api/reset-password` → `/reset-password`) and fixed controller invocation syntax
  - **Test Files Updated**: `InviteSystemIntegrationTest` (4 tests), `JetstreamApiContractTest` (3 tests), `JetstreamEmailFlowTest` (2 tests), `EmailLinkIntegrationTest` (1 test), `EmailVerificationFlowTest` (3 tests), `InviteSystemAuthTest` (4 tests)
  - **Final Result**: Backend 430/430 tests passing (1,863 assertions), Frontend 338/338 tests passing, 0 failures

- **Code Quality Improvements**:
  - **Service Layer Cleanup**: Removed double-caching bug in `SettingsService` (delegated caching to Settings model)
  - **Provider Architecture**: Moved Fortify response bindings from `FortifyServiceProvider::register()` to `AppServiceProvider::boot()` for proper package binding override
  - **Deptrac Configuration**: Updated architecture validation rules to reflect Fortify response bindings location change
  - **Code Style Fixes**: Applied Laravel Pint formatting across all modified files (140+ style improvements)
  - **Import Cleanup**: Removed unused imports and fixed namespace issues across multiple files
  - **Spatie MediaLibrary**: Removed obsolete `performOnCollections()` calls (deprecated in v11, replaced with automatic collection inference)
  - **Frontend Type Safety**: Fixed TypeScript type assertions in `EmailVerificationPrompt` and MSW handlers

### Added

- **🔥 HIGH IMPACT: Session-Based Authentication Migration**:
  - Migrated from token-based (Sanctum) to cookie-based session authentication for SPA
  - **Two-Step Login Flow**: Email verification first, then password entry (prevents account enumeration)
  - **Email Existence Check**: New `/api/check-email` endpoint and auto-redirect to registration
  - **Improved Auth API**: Separate `authApi` instance for Fortify routes (no `/api` prefix)
  - **Enhanced Test Coverage**: Updated all auth-related tests for new flow (96+ test updates)
  - **Better UX**: Back button, pre-filled email, clearer error states in login form
  - **Auth Response Changes**: Login/register now return user object instead of tokens
  - **Simplified Context**: Removed token management, direct user state from auth responses
  - **Breaking**: `access_token` and `token_type` removed from login/register responses
- **Filament Admin Policies**: Created 6 policy classes for proper authorization:
  - `EmailConfigurationPolicy`, `EmailLogPolicy`, `InvitationPolicy`
  - `NotificationPolicy`, `NotificationTemplatePolicy`, `PetTypePolicy`, `WaitlistEntryPolicy`
  - All policies use Shield permission checks or admin role verification
- **Deployment Infrastructure**:
  - **Enhanced Backup Script**: Silent tar output, summary statistics, file counts
  - **Database Safety Documentation**: Migration strategy guide in `docs/deploy.md`
  - **Troubleshooting Guide**: Database corruption prevention in `docs/troubleshooting.md`
    - **Migration Control**: Explicit `RUN_MIGRATIONS=false` in docker-compose to prevent race conditions

### Changed

- **Frontend Code Quality Overhaul** (140+ ESLint auto-fixes):
  - Fixed all void expression violations (proper async handling with `void` keyword)
  - Eliminated unsafe `any` types across components, pages, and tests
  - Consistent nullish coalescing (`??`) instead of logical OR for defaults
  - Proper type assertions and casting (removed `as unknown as` patterns)
  - Function type consistency (arrow functions, proper event handlers)
  - Improved test utilities and mock typing
- **Test Suite Updates** (Session Auth Migration):
  - Updated 96+ test files for cookie-based authentication
  - Removed token-based auth mocks, added session-based flows
  - Fixed test helpers to use `web` guard instead of Sanctum
  - Updated MSW handlers for new auth endpoints (no `/api` prefix for Fortify)
  - Enhanced test reliability with proper async handling
- **Backend Test Improvements**:
  - Fixed code style violations (spacing, indentation, trailing newlines)
  - Improved test reliability with proper guards and auth setup
  - Added `Settings::set('email_verification_required', 'false')` to TestCase
  - Configured Sanctum stateful domains for test environment
- **Auth UX Enhancements**:
  - Login page: Wider max-width container (better mobile UX)
  - Register page: Pre-fill email from query params (seamless redirect from login)
  - Verification prompt: Proper async handling for button actions
  - Improved loading states and error messages

### Changed

### Added

- Fortify + Jetstream backend auth foundation for SPA-only flow:
  - Custom Fortify response classes for login/register/logout/password reset with SPA-friendly JSON and non-JSON redirects to FRONTEND_URL
  - Fortify actions for creating users, updating profile info and password, and resetting passwords
  - API endpoint to validate password reset tokens for SPA flow, plus JSON email verification APIs
  - Config: `config/fortify.php` and `config/jetstream.php` tuned for API features, views disabled
  - New middleware `ForceWebGuard` to ensure consistent `web` guard on web routes
  - Added comprehensive backend tests for registration, login, password reset, email verification, profile/password updates, API token management, and 2FA settings
- Frontend auth UX improvements:
  - Rebuilt Forgot Password and Reset Password pages with clear states, error handling, and success flows
  - Added thorough tests for reset token validation and password reset UX
- Deployment safety:
  - Deploy script now seeds essential data on-demand (pet types, email configuration) and guarantees a Super Admin user exists
- Documentation:
  - `docs/authentication.md` explaining Fortify + Jetstream + Sanctum SPA integration
  - `docs/inertia_remove.md` documenting complete removal of Inertia UI and backend Node toolchain
  - `docs/inertia_rollout.md` (historical) notes from the prior evaluation

### Added

- **🔥 HIGH IMPACT: MediaLibrary Integration**:
  - Migrated from custom file upload system to `spatie/laravel-medialibrary` for unified media management
  - **User Avatars**: Automatic conversions (128px thumb, 256px standard, WebP format)
  - **Pet Photos**: Multiple photo support with conversions (256px thumb, 1024px medium, WebP format)
  - **Admin Panel Enhancements**: Added avatar and photo displays to user and pet admin views
    - User table: Circular avatar thumbnails (40px) with toggle visibility
    - Pet table: Circular photo thumbnails (40px) with toggle visibility
    - User view page: Large avatar display (150px) with user information layout
    - Pet view page: Large photo display (200px) with comprehensive pet information
    - **File Upload Actions**: Custom upload/delete actions in admin panel view pages
    - **Photo Management**: Dedicated photos management page for pets with bulk operations
  - **Automatic File Cleanup**: Files properly removed when records are deleted
  - **API Compatibility**: Maintained backward compatibility - `avatar_url` and `photo_url` fields work identically
  - **Enhanced Image Processing**: Automatic optimization and multiple format support
  - **Backfill Command**: `medialibrary:backfill` for migrating existing files with dry-run support

### Changed

### Changed

- **Breaking:** Removed SQLite support entirely - PostgreSQL is now the only supported database
- Default database connection changed from SQLite to PostgreSQL in all environments
- Tests now run against PostgreSQL instead of SQLite in-memory database
- Queue and batching configuration updated to use PostgreSQL instead of SQLite fallbacks
- Pet API: Deprecated strict required exact `birthday`; now optional and superseded by precision + component fields. Supplying legacy `birthday` alone auto-coerces precision=day.
- **Email Configuration:**
  - Both SMTP and Mailgun configurations now require test email address for sending test emails
  - Test connection action labels unified to "Send Test Email" for both providers
  - Email configuration seeder updated with dev.meo-mai-moi.com domain and pavel@catarchy.space test recipient
  - Enhanced email configuration validation to include optional test_email_address field

### Added

- PgAdmin interface for local database management
- Enhanced documentation for PostgreSQL-only development workflow
- Comprehensive frontend code quality improvements with 140+ ESLint fixes
- Support for approximate / unknown pet birthdays via `birthday_precision` enum (`day|month|year|unknown`) and component fields `birthday_year`, `birthday_month`, `birthday_day`; frontend form precision selector & age display helper.
- Notification Templates system (Phase 1-2):
  - Registry-driven notification types with channel support and variable docs (`backend/config/notification_templates.php`).
  - File-based defaults with locale fallbacks:
    - Email: Blade views at `emails.notifications.{locale}.{slug}` (legacy path supported).
    - In-App: Markdown at `resources/templates/notifications/bell/{locale}/{slug}.md`.
  - DB overrides via Filament admin resource (CRUD) with:
    - Full preview modal (email HTML, in-app text)
    - Compare with default (side-by-side)
    - Reset to default (removes override)
    - Send test email to logged-in admin
    - Type select populated from registry, channel-aware filtering, triggers browser modal
    - Prefill from defaults when selecting type/channel/locale
    - Filters and variable docs panel
  - Services: locale resolver, template resolver, renderer; email + in-app integration with safe fallbacks.
  - Seeder: `NotificationTemplateSeeder` seeds two inactive in-app overrides for quick discovery.
- **Email Configuration Enhancements**:
  - Added test email address field for Mailgun API configurations (matching existing SMTP functionality)
  - Test emails now create EmailLog entries and appear in admin panel at `/admin/email-logs`
  - Added `php artisan email:setup` command for quick configuration with domain-specific defaults
  - Enhanced email configuration validation to include test email address format checking
  - Added comprehensive email configuration documentation at `docs/email_configuration.md`

### Fixed

- Resolved test failures after SQLite removal by installing `postgresql-client` and fixing test setup to use seeders
- **MediaLibrary WebP Support**: Added WebP support by installing `libwebp-dev` and configuring GD with `--with-webp`
- **Admin Panel File Uploads**: Added custom upload actions to user and pet view pages for proper MediaLibrary integration
- **Major Code Quality Overhaul:** Fixed 140+ ESLint violations across the entire frontend codebase:
  - Converted type aliases to interfaces for better TypeScript practices
  - Removed unnecessary conditionals and optional chaining
  - Fixed floating promises and void expressions for proper async handling
  - Eliminated unsafe `any` usage and unused variables
  - Applied consistent nullish coalescing patterns
- Fixed broken `HelperProfileEditPage` test suite:
  - Added photos to mock data to support photo deletion testing
  - Improved test selectors to handle multiple elements correctly
  - Fixed missing test setup imports (`beforeAll`, `afterAll`)
  - All 6 test cases now pass successfully
- Maintained all existing functionality while significantly improving code quality
- **Email Configuration:** Fixed test email failures by adding missing `symfony/http-client` dependency required by Mailgun mailer
  - Added confirmation dialogs to email configuration delete actions to prevent accidental deletion
  - Improved empty state messaging in email configuration admin panel to guide users when no configurations are visible
- **Email Configuration Improvements:**
  - Fixed test emails not appearing in email logs by creating EmailLog entries for all test emails
  - Fixed inconsistent user experience between SMTP and Mailgun test email functionality
  - Improved error handling and user feedback for email configuration testing
  - Enhanced email configuration seeder with domain-specific defaults (dev.meo-mai-moi.com)

### Removed

- SQLite database connection configuration and references
- `sqlite3` package from Docker image (no longer needed)
- SQLite database file creation from Composer post-install scripts
- SQLite references from documentation and development guides
- **Legacy File Upload System Cleanup**:
  - Removed `FileUploadService` class (replaced by MediaLibrary)
  - Removed `PetPhoto` model (replaced by MediaLibrary media records)
  - Dropped `users.avatar_url` database column (now computed from MediaLibrary)
  - Dropped `pet_photos` database table (replaced by MediaLibrary `media` table)
  - Updated database seeders to use MediaLibrary instead of legacy photo creation

### Unreleased (delta)

- **🔥 HIGH IMPACT: Pet Photo Upload System Redesign**:
  - **Single Photo Logic**: Migrated pet photos from multi-photo to single photo system (like user avatars)
  - **Consistent UX**: Upload/Remove buttons now appear on pet edit page, not view page
  - **MediaLibrary Integration**: Backend now clears existing photos before adding new ones (single photo collection)
  - **Enhanced UI**: Upload and Remove buttons positioned below pet photo with clean styling
  - **API Improvements**: Added support for deleting "current" photo via `/pets/{id}/photos/current` endpoint
  - **Component Architecture**: Created reusable `PetPhoto` component with upload controls
  - **Test Coverage**: Comprehensive test suite for pet photo upload functionality (9 test cases)
  - **Removed Multi-Photo Support**: Simplified from complex multi-photo system to single photo (matching avatar pattern)
  - **Form Integration**: Removed photo upload from create/edit forms, moved to dedicated photo management on edit page
  - **Backward Compatibility**: Maintained `photo_url` API field with proper MediaLibrary integration
- **Admin Panel Navigation Improvements**: Reorganized navigation groups for better clarity and usability:
  - Moved "Roles" from "Filament Shield" section to "System" section
  - Moved "Users" from "Filament Shield" section to "Users & Helpers" section as first item
  - Removed empty "Filament Shield" section
  - Moved "Pets" to top of "Pet Management" section
  - Renamed "User Access" section to "Invitation"
  - Updated navigation groups structure: Pet Management, Users & Helpers, Invitation, Communication, System
  - Published and customized UserResource for better control over navigation ordering
- Frontend: Added a prominent "Lost" status badge to `PetCard` and corresponding unit test to ensure the badge renders when `pet.status === 'lost'`.
- Frontend tests: Fixed typing for test helpers (added `MockUser` type) so tests accept a mock user object; all `PetCard` tests pass.
- Password flow: Moved password change UI to a dedicated `/account/password` page (`PasswordPage`), updated `ChangePasswordForm` to force logout and redirect to `/login` after a successful password change, and updated tests to assert logout/redirect behavior and adjusted copy.
- Profile page: Replaced inline password form with a link to the new password page and small UI polish for the password card.
- Create/Edit Pet page: Added edit-mode improvements: navigation back button, photo preview for current pet photo in edit mode, and redirect to the pet profile after status updates.
- Frontend package: changed test script to run `vitest run` (removed `--silent` flag) to surface test output during runs.
- Documentation: Removed several backend docs files (notification-related docs, OpenAPI dump, unsubscribe, send-email job, and other legacy docs) as part of documentation cleanup.
- Repo config: Tweaked `.gitignore` and updated `backend/.env.docker` handling (dev docker env changes).

### Changed

- SPA-only UI: Removed dependency on server-rendered Inertia pages and ensured all non-JSON auth responses redirect into the SPA
- Web routes updated to redirect reset-password and email verification flows into SPA routes where applicable
- Backend configured as API-first for UI flows; Jetstream retained only for API features (tokens, 2FA) with views disabled
- Frontend tests and setup streamlined: improved mocking for `sonner` and added reset password page tests

### Removed

- Inertia/Vue UI from the backend (no backend JS/Vite build used to serve UI)
- Backend Node/Vite/Tailwind tooling tied to Inertia UI (kept out of runtime; see docs/inertia_remove.md)

#### Major Backend Refactoring - Code Quality & Architecture Overhaul

- **🔥 HIGH IMPACT: Trait-Based Architecture Implementation**:

  - Created `HandlesAuthentication` trait for centralized user authentication and authorization patterns
  - Created `HandlesPetResources` trait for consistent pet ownership validation and resource access
  - Created `HandlesValidation` trait for standardized validation patterns and error handling
  - Enhanced `ApiResponseTrait` with consistent API response formats
  - Refactored 9 controllers to use trait-based architecture: `VaccinationRecordController`, `WeightHistoryController`, `MedicalNoteController`, `PetMicrochipController`, `PetPhotoController`, `InvitationController`, `WaitlistController`, `PetController`, `TransferHandoverController`
  - **Impact**: Eliminated 200+ lines of repetitive code, consistent patterns across all pet resource endpoints, improved maintainability with centralized changes

- **🔥 HIGH IMPACT: Service Layer Complexity Reduction**:

  - **NotificationService** refactoring (complexity 14 → 6): Extracted `NotificationChannelInterface`, `EmailNotificationChannel`, `InAppNotificationChannel`, and `EmailConfigurationStatusBuilder` for better separation of concerns
  - **WaitlistService** refactoring (complexity 14 → 8): Created `WaitlistValidator`, `WaitlistStatsCalculator`, and `BulkInvitationProcessor` for focused responsibilities
  - **PetCapabilityService** refactoring (complexity 10 → 4): Extracted `CapabilityChecker`, `CapabilityMatrixBuilder`, and `CapabilityValidator` with maintained static interface
  - **Impact**: Significantly reduced cyclomatic complexity, improved testability with focused components, better maintainability and readability

- **🔥 HIGH IMPACT: Long Function Decomposition**:

  - **EmailConfigurationService** refactoring: Broke down 73-line `testConfigurationWithDetails()` method into focused components
  - Created `ConfigurationTester` class with specialized methods: `prepareTestConfiguration()`, `validateConfiguration()`, `performConnectionTest()`, `setupTestMailConfiguration()`, `sendTestEmail()`, `handleTestException()`
  - **Impact**: Improved code readability, better error handling and categorization, enhanced testability with single-responsibility methods

- **🔥 MEDIUM IMPACT: Error Handling Standardization**:

  - Created `HandlesErrors` trait with centralized error handling methods
  - Standardized error response formats across all endpoints with specialized handlers:
    - `handleValidationError()` for 422 validation errors
    - `handleNotFound()` for 404 resource not found
    - `handleUnauthorized()` for 401 authentication errors
    - `handleForbidden()` for 403 authorization errors
    - `handleBusinessError()` for business logic errors
    - `handleRateLimit()` for 429 rate limiting
    - `handleException()` for general exception handling with logging
  - Updated `WaitlistController`, `InvitationController`, and `PetController` with consistent error handling
  - **Impact**: Consistent error formats, centralized logging for debugging, reduced code duplication, better user experience

- **Quality Assurance**: All 575 tests passing with zero breaking changes, comprehensive test coverage validates all refactoring changes, backward compatibility maintained for all APIs

#### Invitation System Implementation

- **Feature Complete**: Implemented a comprehensive invitation and waitlist system with both open and invite-only registration modes
- **Backend Implementation**:
  - Added `Invitation`, `WaitlistEntry`, and `Settings` models with full relationship support
  - Created `InvitationService`, `WaitlistService`, and `SettingsService` with caching layer
  - Implemented `InvitationController`, `WaitlistController`, and `SettingsController` with rate limiting
  - Added email notifications: `InvitationToEmail` and `WaitlistConfirmation`
  - Created database migrations for invitations, waitlist entries, and settings tables
  - Integrated invitation validation into registration flow via `ValidInvitationCode` rule
  - Published and customized Laravel email templates (HTML and text versions)
- **Frontend Implementation**:
  - Created TypeScript API client (`invite-system.ts`) with full type definitions
  - Implemented `WaitlistForm` component for joining waitlist with validation
  - Built `InvitationShare` component for sharing via email, SMS, link, and message
  - Developed `InvitationQRCode` component for QR code generation and download
  - Created `InvitationsPage` for managing invitations with statistics dashboard
  - Implemented `useInviteSystem` hook for automatic registration mode detection
  - Added responsive UI with status badges, date formatting, and action buttons
- **Testing**:
  - Backend: 8 feature test suites with 40+ test cases covering all endpoints and integration flows
  - Backend: 6 unit test suites with 50+ test cases for models and services
  - Frontend: 5 component/page test suites with 30+ test cases
  - Frontend: Hook tests for registration mode detection
  - All tests passing with comprehensive coverage of happy paths and edge cases
- **Documentation**: Created detailed `docs/invites.md` covering architecture, API endpoints, user workflows, configuration, security, and troubleshooting
- **Features**:
  - Toggle between open and invite-only registration modes
  - Generate unique 32-character invitation codes with optional expiration
  - Share invitations via QR code, email, SMS, or direct links
  - Manage sent invitations: view status, revoke pending invitations
  - Waitlist system for restricted registration mode
  - Rate limiting: 10 invitations per user per day
  - Email notifications for invitations and waitlist confirmations
  - Real-time invitation statistics and status tracking
  - Automatic invitation validation during registration
  - Settings caching for optimal performance
