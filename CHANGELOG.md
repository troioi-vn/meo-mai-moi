# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Tailwind CSS v4 Migration**: Successfully migrated to Tailwind CSS v4 with modern configuration
  - Migrated from Tailwind v3 to v4 using `@import 'tailwindcss'` syntax
  - Implemented proper `@plugin 'tailwindcss-animate'` for animations
  - Added `@custom-variant dark (&:is(.dark *))` for improved dark mode support
  - Introduced `@theme inline` directive to expose CSS variables to Tailwind utilities
  - Dual color system: HSL (backward compatibility) + OKLCH (modern Tailwind v4)
  - All 24 shadcn-ui components reinstalled and verified working with new Tailwind setup
  - Active tabs now properly highlighted with correct styling
- **Enhanced Custom Form Components**: Improved accessibility and UX for custom form field components
  - **CheckboxField**: Added `description` prop, proper error positioning, improved ARIA attributes
  - **FileInput**: Added `accept`, `description`, and `required` props with better accessibility
  - **FormField**: Added `email`, `number` types, `description`, and `disabled` props with enhanced ARIA support
  - All form components now follow shadcn-ui design patterns consistently
- **Modern Loading States**: Replaced basic "Loading..." text with professional skeleton components
  - **LoadingState**: Now uses shadcn Skeleton component with 3 variants (`default`, `card`, `list`)
  - Provides modern, professional loading experience matching contemporary UX standards
  - Maintains backward compatibility with existing `message` prop
- **Improved Error Handling**: Enhanced error state component with shadcn Alert
  - **ErrorState**: Now uses shadcn Alert component with AlertCircle icon
  - Two variants: `default` (full-screen) and `minimal` (inline)
  - Better visual hierarchy with AlertTitle and AlertDescription
  - More professional and accessible error presentation

### Changed

- **Settings Hub**: Introduced `/settings` route with shadcn tabs for Account, Notifications, and Contact sections
  - Consolidated profile and session management cards inside the Account tab
  - Added modal-based password change dialog instead of a full-page form
  - Added placeholder Contact tab so future messaging/config work has a surfaced destination
- **Tooltip Component**: Added Radix UI tooltip component (`@radix-ui/react-tooltip`) for better UX
  - Created reusable tooltip component at `frontend/src/components/ui/tooltip.tsx`
  - Used for "Show all" filter to explain it includes deceased pets
- **Interactive Telegram Setup**: Added interactive prompts in `setup.sh` for configuring Telegram bot notifications
  - Prompts for `TELEGRAM_BOT_TOKEN` and `CHAT_ID` during first-time setup
  - Includes helpful instructions for creating a bot via @BotFather
  - Optional feature - can be skipped or configured later
- **In-App Deployment Notifications**: Added ability to notify superadmin user in-app when deployments complete
  - New `NOTIFY_SUPERADMIN_ON_DEPLOY` environment variable (true/false)
  - Interactive setup prompt during first-time configuration
  - Created `app:notify-superadmin` artisan command for sending notifications
  - Uses existing `Notification` model for seamless integration with notification system
  - Automatically sends notification with deployment details (environment, commit hash, timestamp)
  - Integrates with existing notification center and push notification system

### Changed

- **Navigation & Routing Cleanup**: `/settings` now replaces the legacy `/account` and `/account/notifications` pages
  - User menu links directly to `/settings/account` for profile and account actions
  - My Pets, Invitations, and helper profile links remain separate under `/account/*` and `/helper*`
  - Deprecated profile and notifications pages removed to prevent dead links and duplicated UI
  - Settings tests (`SettingsPage.test.tsx`, routing smoke tests, nav/menu specs) updated for new paths
- **Test Notifications**: Enhanced `--test-notify` flag to test both Telegram and in-app notifications
  - Previously only tested Telegram notifications
  - Now tests both notification systems and reports their configuration status
  - Shows clear feedback for enabled/disabled notification types
  - Usage: `./utils/deploy.sh --test-notify`

### Fixed

- **Avatar Display Issue**: Fixed avatar images not displaying correctly on first load (showing placeholder instead)

  - **Root Cause**: Migration from direct `avatar_url` column to Spatie MediaLibrary caused timing issues where MediaLibrary conversions were not immediately available and Radix UI Avatar component would timeout before image loaded
  - **Backend Fix**: Modified `User::getAvatarUrlAttribute()` to fall back to original image if conversion is not ready yet
  - **Frontend Fix**: Added image preloading in `UserMenu` and `UserAvatar` components to ensure images are cached before rendering
  - **UI Enhancement**: Added `referrerPolicy="no-referrer"` to `AvatarImage` component for better cross-origin support
  - Avatar now displays correctly immediately after login without requiring page navigation

- **Progressive Web App (PWA)**: Full PWA implementation with:
  - Service worker for offline support and app shell caching
  - Web app manifest with light/dark theme variants
  - Offline fallback page
  - Runtime caching strategies (NetworkFirst for API, CacheFirst for images)
  - Maskable icons for adaptive display across devices
  - Dynamic theme-color switching based on user preference (light/dark mode)
  - Root-scoped service worker for full app coverage
  - Automatic manifest swapping when theme changes
  - `vite-plugin-pwa` integration with manual registration
- **Web Push Notifications**: Native OS notifications for in-app alerts with:
  - Push subscription API (`POST/DELETE /api/push-subscriptions`) and persistence
  - Background dispatcher using VAPID-authenticated Web Push to deliver notification payloads
  - Updated notification settings UI to request permission, manage device state, and surface errors
  - Service worker listeners for push delivery, subscription refresh, and click-through deep linking
- **Web Push Build Configuration**: Fixed push notifications failing with "Push notifications are not configured" error
  - Root cause: `VITE_VAPID_PUBLIC_KEY` was not available during Docker image build, resulting in frontend bundle with undefined value
  - Solution: Export `VAPID_PUBLIC_KEY` from env file before running `docker compose build`
  - Configuration simplified to single source of truth via dual-file approach (root `.env` and `backend/.env`)
  - Updated `docker-compose.yml` to forward `VAPID_PUBLIC_KEY` as build arg
  - Updated `backend/Dockerfile` to export both `VAPID_PUBLIC_KEY` and `VITE_VAPID_PUBLIC_KEY` from the same build arg
  - Updated `utils/deploy_docker.sh` to read and export `VAPID_PUBLIC_KEY` from env file before builds
  - Push subscription flow now works correctly in all environments
- **Notification Toast**: Fixed duplicate toast notifications appearing on ctrl+refresh
  - Removed redundant initial fetch effect in `NotificationProvider` that conflicted with user change effect
  - Toasts now appear only once per notification
- **Deployment Script**: Fixed deployment exiting prematurely when Telegram notifications are misconfigured
  - Root cause: `curl` failures in command substitutions were triggering ERR trap despite exit code being captured
  - Solution: Use temporary file for curl output to avoid subshell ERR trap issues
  - Deployment now continues successfully even if Telegram notifications fail (logs warning instead of exiting)
  - Fixed incorrect variable names in `--test-notify` flag handler (`DEPLOY_NOTIFY_BOT_TOKEN` → `TELEGRAM_BOT_TOKEN`)
- **In-App Deployment Notifications**: Fixed database constraint violation and missing notification body
  - Root cause: Custom `notifications` table schema requires `message` field (NOT NULL), but Laravel's standard notification system only populates `data` (JSON)
  - Solution: Changed from Laravel's notification system to direct `Notification` model creation
  - Notification now properly populates all required fields including `message`, `type`, `data`, and `delivered_at`
  - **API Fix**: Updated `NotificationController` to properly extract `title` and `body` from the `data` JSON field instead of looking for non-existent model properties
  - Deployment notifications now display with full title and body text in the frontend notification bell

### Changed

- **Environment Configuration**: Migrated to dual-file approach for better separation of concerns

  - **Root `.env`**: Docker Compose variables (build args like `VAPID_PUBLIC_KEY`, database credentials)
  - **`backend/.env`**: Laravel runtime configuration (APP_KEY, mail settings, etc.)
  - Replaced `backend/.env.docker` with cleaner `backend/.env` naming
  - Automatic legacy migration: deploy script detects old `backend/.env.docker` and migrates to new structure
  - Updated all deployment scripts (`utils/setup.sh`, `utils/deploy_docker.sh`) to use dual-file approach
  - Docker Compose now automatically reads root `.env` file (no manual exports needed)
  - Simplified VAPID key management - Docker Compose handles build args automatically
  - **Automatic VAPID key generation**: Setup script now offers to generate VAPID keys using `npx web-push generate-vapid-keys`
    - Interactive prompt during first-time setup with clear warnings about key regeneration
    - Automatic sync of VAPID keys from root `.env` to `backend/.env`
    - Skipped in non-interactive mode for safety in CI/CD environments
    - Checks for Node.js/npx availability before attempting generation
  - Updated documentation (README.md, docs/deploy.md, docs/push-notifications.md) to reflect new structure
  - Created `.env.example` template for root Docker Compose variables
  - Created `backend/.env.example` template for Laravel runtime variables

- **My Pets Page UI Improvements** (`/account/pets`):

  - Changed page header from "My Pets" to "Pets" for cleaner, more concise title
  - Removed "Owned" section header (pets shown without redundant header)
  - Moved deceased pet filter from top of page to below pet list for better context
  - Changed filter label from "Show all (including deceased)" to "Show all" with tooltip
  - Filter now automatically hidden when user has no deceased pets
  - Improved overall page layout and information hierarchy

- **PetCard Component Simplification**:

  - Removed pet type badge display (no longer shows "Cat", "Dog", etc.)
  - Removed breed information from card
  - Removed location field from card
  - Streamlined card to show only essential information: name, age, status badges, and actions
  - Cleaner, more focused card design

- **Git Repository Cleanup**: Removed `.deploy/` directory from version control (already in `.gitignore`, now untracked from repository history)
- **Deploy workflow**: Skip Filament Shield regeneration by default during `deploy.sh`; re-enable with `SHIELD_GENERATE=true` when permission scaffolding needs to be refreshed, preventing unintended overwrites of customized policies
- **Dependencies**: Updated Vite to ^7.2.2 and added vite-plugin-pwa ^1.1.0 for PWA support
- **Build process**: Extended `copy-assets.cjs` to copy PWA assets (manifests, offline page, icons, service worker) to Laravel public root
- **Blade template**: Added dynamic manifest swap script and theme-color meta tag to `welcome.blade.php`

### Fixed

- **PWA theme color**: Fixed PWA top bar color showing old orange color instead of respecting current theme (light/dark/system)
  - Updated `site.webmanifest` to use white theme color instead of orange
  - Enhanced theme provider to dynamically update theme-color meta tag when theme changes
  - Updated HTML templates (frontend and backend) to properly initialize and update theme-color based on user preference
  - Theme-color now correctly switches between white (#ffffff) for light mode and dark gray (#111827) for dark mode
- **Array offset warning**: Fixed "Trying to access array offset on value of type null" warning in `EmailConfigurationService::updateMailConfig()` when accessing `$mailConfig['from']['address']` with proper null coalescing operators
- **Pet detail access**: Ensured regular owners and admins can view pet profiles by retaining ownership-aware policy logic even when Filament Shield assets are regenerated
- **Tabs Component Styling**: Fixed active tab not being properly highlighted after Tailwind CSS v4 migration
  - Root cause: Incorrect color structure in `tailwind.config.js` and missing CSS variable mappings
  - Fixed by properly nesting color objects and implementing `@theme inline` directive
  - All shadcn-ui components now render correctly with proper styles

### Removed

- **Orphaned Component Files**: Cleaned up unused and redundant component files
  - Removed `calendar-icon.tsx` (redundant re-export of lucide-react Calendar icon)
  - Removed `badge-variants.ts` (orphaned file not used by badge component)
  - Removed `button-variants.ts` (orphaned file not used by button component)
  - Components now import variants directly from their respective component files

### Icons & Branding Assets

#### Summary

Standardized app favicon and PWA icons across backend and frontend entry points, and automated future updates.

#### Added

- `utils/update_icon.sh` script to regenerate favicon bundles, Apple touch icon, and web manifest from a single source image.

#### Changed

- Updated frontend and backend entry HTML to reference the shared icon bundle and manifest for consistent browser presentation.

### Authentication & Password Reset UX Improvements

#### Summary

Significant improvements to the authentication flows with focus on user experience, error handling, and accessibility. Fixed password reset redirect, improved forgot password workflow, and added password visibility toggles.

#### Added

- **Password visibility toggle**: Eye/EyeOff icons added to toggle password visibility on:
  - Login page (password field)
  - Register page (password and password confirmation fields)
  - Reset password page (already existed)
- **Auto-focus fields**: Automatic focus on form load for better UX:
  - Email field auto-focuses on login page
  - Password field auto-focuses when proceeding to password step
- **Email prefill**: Email from login form is automatically prefilled in forgot password form when accessed from login
- **Global mail exception handler**: Added comprehensive exception handling in `bootstrap/app.php` for mail transport errors
  - Catches `Swift_TransportException` and `Symfony\Component\Mailer\Exception\TransportExceptionInterface`
  - Walks through exception chain to detect wrapped mail exceptions
  - Returns user-friendly JSON error messages for both password reset and email verification flows
- **Enhanced test coverage**: Added tests for:
  - Password visibility toggle functionality (LoginForm, RegisterForm)
  - Email prefill from URL parameters (ForgotPasswordPage)

#### Changed

- **Password reset redirect**: Fixed redirect logic to properly redirect users to login page after successful password reset
- **Forgot password success state**: Now displays "Check Your Email" confirmation screen instead of remaining on the form
- **Password reset response handling**: Fixed response parsing to detect success (was checking for non-existent boolean field)
- **Forgot password response handling**: Fixed response parsing to properly trigger success state
- **Input focus ring styling**: Reduced focus ring thickness from 3px to 1.5px for all input fields (both light and dark modes)
- **PasswordResetController**: Simplified to only handle token validation endpoint; removed redundant custom password reset logic (Fortify handles all password operations)
- **Error messages**: Both password reset and email verification flows now show user-friendly error messages when email service is unavailable

#### Removed

- **Custom password reset handlers**: Removed `handleJetstreamPasswordResetLinkRequest` and `handleJetstreamPasswordReset` methods from PasswordResetController
- **Redundant error handling**: Removed try-catch blocks from PasswordResetController (now handled globally in bootstrap/app.php)

#### Bug Fixes

- Fixed password reset not redirecting after successful reset
- Fixed forgot password form not showing success state after sending email
- Fixed thick/prominent focus rings on input fields making UI appear heavy
- Fixed password reset and forgot password flows not showing user-friendly error messages when mail service fails

#### Tests

- Updated mock API responses to match actual backend responses in:
  - ResetPasswordPage tests
  - ForgotPasswordPage tests
- Added password visibility toggle tests for LoginForm and RegisterForm
- Added email prefill test for ForgotPasswordPage
- Fixed pre-existing TypeScript type error in RegisterForm test
- All 343 tests passing

### Email Delivery & Verification Refactor (Pending Release)

#### Summary

Comprehensive overhaul of the email delivery pipeline and verification experience with a focus on correctness, idempotency, observability, and future extensibility.

#### Added

- Email event tracking migration adding: `opened_at`, `clicked_at`, `unsubscribed_at`, `complained_at`, `permanent_fail_at` plus supporting indexes.
- Mailgun webhook handler now processes full lifecycle events: `accepted`, `delivered`, `opened`, `clicked`, `unsubscribed`, `complained`, `failed` (permanent) and temporary failures (kept pending).
- New status lifecycle: `pending → accepted → delivered` (with auxiliary events above). Legacy `sent` renamed to `accepted` for semantic clarity (provider accepted for delivery vs user mailbox delivered).
- New model helpers on `EmailLog`: `markAsAccepted()`, `markAsOpened()`, `markAsClicked()`, `markAsUnsubscribed()`, `markAsComplained()`, `markAsPermanentFail()`.
- Idempotency configuration (`config/notifications.php`) with `EMAIL_VERIFICATION_IDEMPOTENCY_SECONDS` (default 30s) applied in three layers:
  1. Custom notification email channel
  2. `RegisterResponse` (initial send)
  3. Verification resend controller endpoint
- Feature tests: `RegistrationEmailVerificationTest`, `EmailVerificationIdempotencyTest`, and expanded `MailgunWebhookTest` for all tracked events.
- Frontend UX wrappers for async resend / alternate email actions on `EmailVerificationPage` with resilient localStorage state handling & cooldown UI.

#### Changed

- Renamed all uses of status `sent` → `accepted` across admin resources, model display helpers, logs, and queue/job code.
- `SendNotificationEmail` now marks logs as `accepted` instead of `sent` immediately after the mail is handed to the framework / provider.
- Webhook failure handling distinguishes permanent vs temporary failures (`markAsPermanentFail` vs leaving `pending`).
- Registration flow no longer dispatches email verification inside `CreateNewUser`; unified in `RegisterResponse` to prevent duplicate emails & race conditions.
- Email verification resend endpoint returns a friendly message instead of silently doing nothing when inside idempotency window.
- Updated `EmailVerificationMail` & test mail classes for constructor signature consistency and reduced unnecessary public properties.
- Documentation (`docs/email_configuration.md`) expanded with lifecycle diagram, status definitions, and idempotency explanation.

#### Removed

- Duplicate verification email trigger in `CreateNewUser` (eliminates sporadic double sends under load).

#### Internal / Quality

- Helper profile status event encapsulated (`private` + getter) and listener updated with explicit user type narrowing.
- More precise logging (debug-level context for non-fatal paths & idempotent skips).
- Added parentheses to fluent instantiations (`new Class()`) for consistency and stricter static analysis happiness.

#### Migration Notes

The migration renames existing `email_logs.status = sent` to `accepted`. No data loss. Rollback restores previous value. Ensure any external analytics relying on the old value are adjusted.

#### Operational Impact

```

- Mailgun webhooks must be configured to POST to `/api/webhooks/mailgun` including all new events for full observability.
- Set `EMAIL_VERIFICATION_IDEMPOTENCY_SECONDS` in production if a window other than 30s is desired.

#### Follow-ups (Not Included In This Commit Series)

- Consider aggregation dashboard for engagement metrics (open/click rates) in admin.
- Soft-delete or archival strategy for very large `email_logs` tables.
- Rate limiting resend endpoint beyond simple time gate (per-IP + per-user counters).

### Added

- **Local HTTPS Development Support (single compose, env-driven)**
  - `utils/generate-dev-certs.sh` script to generate localhost certificates
  - Single `docker-compose.yml` used for all environments; HTTPS toggled via `ENABLE_HTTPS` in `backend/.env.docker`
  - Nginx configuration remains HTTP by default; entrypoint dynamically enables HTTPS when `ENABLE_HTTPS=true` and certificates are present
  - `deploy.sh` auto-generates certificates when `APP_ENV=development` and `ENABLE_HTTPS=true`
  - Production deployments unaffected - typically handled by a reverse proxy with valid certificates
- **VitePress Documentation Integration**: Project documentation now served at `/docs` route
  - VitePress docs build integrated into deploy workflow
  - Docs accessible at http://localhost:8000/docs (or https://localhost/docs with dev certs)
  - Root npm scripts added for docs management: `docs:dev`, `docs:build`, `docs:preview`
- SPA catch‑all web route: serve the React app for all non‑API/non‑admin paths, preserving path and query. When same‑origin, return `welcome` directly; otherwise, external redirect to `FRONTEND_URL`.
- Email verification UX: confirmation modal before resending; 60s cooldown and 3‑attempt total limit for resend actions (state persisted in `localStorage`).
- "Use another email" flow with confirmation dialog that logs out and redirects to registration.

### Fixed

- **Frontend**: PhotosGrid component now uses relative URLs (`/storage/`) instead of hardcoded `http://localhost:8000/storage/` for proper protocol-agnostic asset loading
- **Docker Entrypoint**: Fixed permission errors on read-only bind mounts (docs) by only setting permissions on top-level `/var/www/public` directory, not recursively
- Email verification flow now completes entirely via the link: user is auto‑logged in and redirected to the SPA at `/account/pets?verified=1` (uses external redirects to the frontend to avoid backend 404s on SPA routes).
- SPA 404 after verification redirect resolved by the catch‑all route and using `redirect()->away(...)` for verification redirects.
- Email Logs show a readable plain‑text body for verification emails (includes greeting, link, and expiry) instead of raw HTML. Other emails continue logging rendered HTML.
- Duplicate "We've sent …" message on verification prompt after a second resend has been eliminated.
- Prevent duplicate email verification emails on registration (removed duplicate trigger in `CreateNewUser` and added 30s idempotency guard in `RegisterResponse` & channel).

### Changed

- Removed the “Verify your email” reminder from the bell notifications (filtered out `email_verification` type in notifications API).
- Email verification prompt UI: removed manual "I've verified my email" button; removed the large "Resend Verification Email" button in favor of a link with confirmation; added a neutral (outline) "Use another email" trigger instead of destructive styling.
- Email verification page: aligned with the prompt — added resend cooldown/limit and neutral "Use another email" confirm.
- Navigation: when a logged‑in user is unverified, hide app navigation (Requests/Admin/Notifications). Only theme switcher and logout remain accessible.

### Fixed (auth/spa)

- Avoid redirect loops on `/login` and `/register`: when `FRONTEND_URL` is same-origin as the backend, serve the SPA index so the React router handles the route; otherwise 302 redirect to the frontend.
- Password reset web route now consistently redirects to the SPA and builds URLs using `FRONTEND_URL` with a robust fallback to `env('FRONTEND_URL')` (or `http://localhost:5173` in dev).
- `/api/check-email` consistently returns `{ exists: boolean }` and is throttled+audit-logged.

### Changed

- Fortify registration/login hardening: removed manual session login in `CreateNewUser`; simplified `RegisterResponse` to SPA-friendly JSON only.
- Centralized verification email sending logic in `RegisterResponse` (no longer dispatched during user creation) to avoid multi-send race.
- Verified flow: retained custom `verified` alias to preserve JSON error structure; added lean API verification alias for JSON clients/tests.
- Email pipeline resilience: `SendNotificationEmail` no longer throws when email isn’t configured; it logs, marks the notification failed, and creates an in-app fallback instead (prevents 500s during registration).
- Settings cache: `Settings::set()` performs a write-through cache update per key for immediate reads.
- Deployment safety & observability improvements:
  - `utils/deploy.sh` now supports a quiet mode that still streams long-running Docker and Artisan output, plus pre/post DB snapshots that log total users and the status of the watched admin account.
  - Added interactive prompts to rebuild core users via `UserSeeder` when the admin account is missing, and automatic logging of the Postgres volume creation timestamp to detect unexpected resets.
  - Backup prompt restored with resilience fixes; targeted seeder, snapshot, and volume details are captured in both console and `.deploy.log` for easier incident investigation.
  - `UserSeeder` picks up `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and optional `SEED_ADMIN_NAME` from the environment so deployments can override default credentials without code changes; `deploy.sh` watches the same email when reporting DB snapshots.

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
```
