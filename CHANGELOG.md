# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Notifications System**: Implemented a dedicated notifications page with a list view, mark as read functionality, and automatic marking of all notifications as read upon page visit. Added `NotificationList` component for displaying notifications with icons, timestamps, and links.

- **Unified notifications API**: Added `GET /api/notifications/unified` (requires `auth:sanctum` + `verified`) returning unread bell + unread message counts, and (optionally) the latest bell notifications.

- **Cross-tab notification read sync**: Added a real-time `NotificationRead` Echo/Reverb event so unread bell badges and read state stay synchronized across multiple open tabs/devices.

### Changed

- **Notification Bell**: Refactored the notification bell from a dropdown menu to a simple link that navigates to the new notifications page, improving UX by providing a dedicated space for managing notifications.

- **Real-time notification updates**: Removed bell polling and unified real-time updates via Echo/Reverb on the per-user channel (`App.Models.User.{id}`). Nav badges update from counts; the bell list is fetched only when visiting `/notifications`.

- **Unread message badge semantics**: Unread message badge now represents total unread messages (not unread chats). Legacy `GET /api/msg/unread-count` aligns with unified naming via `unread_message_count` (old key kept as deprecated compatibility).

- **Verified-only notification endpoints**: Notifications, notification preferences, and push-subscription endpoints are now grouped under `verified` middleware to match the unified notifications access model.

- **RequestDetailPage Refactor**: Broke down the oversized `RequestDetailPage.tsx` into smaller, focused components under `frontend/src/pages/placement/request-detail/` for better maintainability.

- **NotificationPreferences Component Refactoring**: Split the large `NotificationPreferences.tsx` component into smaller, focused components for better maintainability:
  - `DeviceNotificationsCard.tsx` - Handles device push notification logic and UI
  - `NotificationPreferencesGroups.tsx` - Manages rendering of grouped notification preferences
  - `NotificationPreferencesSkeleton.tsx` - Dedicated loading skeleton component

- **Helper profile pages refactor**: Broke down helper profile list/view/edit pages into smaller components under `frontend/src/components/helper/profile-*` to improve maintainability.

### Fixed

- **Doubled Bell Notifications**: Fixed an issue where rehoming flow notifications appeared twice in the bell UI (once for 'in_app' channel and once for 'email' channel). The `bellVisible` scope now correctly filters out non-in-app notification channels from the bell count and list. Marking all notifications as read also now only affects bell-visible records to preserve engagement state for other channels. (Tests: `UnifiedNotificationsBellVisibilityTest` passed.)

- **Accessibility Improvements**: Fixed screen-reader labels to notification level icons (Success, Warning, Info, Error) and enhanced the notification bell's aria-label to include unread count for better accessibility.

- **Duplicate native notifications**: Fixed an issue where bell notifications could appear twice (push + in-page native notification) during flows like rehoming. The `NotificationProvider` now detects an active Service Worker push subscription and suppresses in-page native notifications when device push is enabled; in-app toasts remain unaffected. (See `frontend/src/contexts/NotificationProvider.tsx` — tests: frontend suite passed.)

- **Duplicate in-app notification toasts**: Fixed an issue where identical in-app notification toasts could appear twice during multi-step flows (e.g. rehoming) due to effects re-running when the auth user object/callback identities changed. The notification refresh lifecycle is now keyed to a stable `userId` to avoid resetting `seenIdsRef` and re-emitting toasts.

- **Empty notification titles**: Notifications now fall back to a human-readable title derived from the notification type when the stored message/title is empty.

### Changed

- **OpenAPI Migration Complete**: Completed migration from `@OA` docblock annotations to PHP 8 attributes:
  - Migrated all 19 OpenAPI controllers from deprecated docblock format to native PHP 8 attributes
  - Upgraded `darkaonline/l5-swagger` from v9.0 to v10.0
  - **Removed dependency**: `doctrine/annotations` (marked abandoned) is no longer required
  - All API endpoints now use modern attribute-based OpenAPI documentation
  - OpenAPI spec generation verified and working with `zircote/swagger-php` v5.7.8

- **Switch to Bun**: Migrated the entire frontend development and build toolchain from npm to [Bun](https://bun.sh/).
  - Replaced `package-lock.json` with `bun.lock` across the workspace (root, frontend, and docs).
  - Updated all `package.json` scripts to use `bun run` and `bun x`.
  - Switched Docker builds to use `oven/bun:1` as the base image for the app-build stage.
  - Updated utility scripts (`utils/setup.sh`, `utils/deploy_docker.sh`, and `frontend/scripts/e2e-test.sh`) to prefer Bun.
  - Updated developer documentation and VS Code tasks to reflect Bun-based workflows.

### Added

- **Parallel Testing**: Enabled parallel testing for backend using ParaTest, significantly reducing test execution time.
- **Improved Testing Stability**: Added logic to skip heavy media conversions during testing to avoid lock contention and race conditions in parallel runs.
- **Documentation Updates**: Updated `GEMINI.md`, `README.md`, and developer guides with latest local development workflows and testing commands.

### Fixed

- **OAuth User Password Reset & Login**: Fixed critical issue where OAuth users could not login after setting their first password via the password reset flow. The root cause was that users remained logged in via OAuth sessions after password reset, causing Fortify to return 302 redirects instead of JSON responses. Resolved by:
  - Removing custom `authenticateUsing` callback that duplicated credential validation
  - Adding session invalidation and logout in `PasswordResetResponse` after successful password reset
  - Regenerating CSRF tokens to prevent stale session data
  - Updating CORS configuration to include all Fortify routes (`register`, `forgot-password`, `reset-password`)
  - Simplifying password reset implementation to use standard Laravel Fortify patterns
- **Notification Template Syntax**: Fixed a syntax error in `NotificationTemplateResource` that prevented the admin panel from loading.
- **Intermittent Test Failures**: Fixed a race condition/logic error in `EmailNotificationDeliveryTest` caused by random `PET_SITTING` request types in factories.
- **Birthday / Age display**: Fixed the birthday column and age calculation in the admin panel and related emails where ages were displayed as negative fractional values (e.g. `-12.637657205655y`). Dates are now rendered as `M j, Y` with the age shown as a positive integer (e.g. `May 25, 2013 (12y)`). Changes were made in `backend/app/Filament/Resources/PetResource.php`, `backend/app/Filament/Resources/PetResource/Pages/ViewPet.php`, `backend/app/Models/Pet.php` (`getAge()`), and relevant email templates (`resources/views/emails/notifications/*`).

### Fixed

- **Chrome PWA Meta**: Added the standard `mobile-web-app-capable` meta tag to `frontend/index.html` and `backend/resources/views/welcome.blade.php.template` to address a deprecation warning shown in Chrome when running the site (the `apple-mobile-web-app-capable` tag is still preserved for compatibility).

### Added

- **OAuth User Password Management**:
  - **`has_password` Flag**: Added `has_password` boolean to user profile response to indicate whether a user has a password set (relevant for OAuth/SSO users)
  - **Smart Password UI**: Settings page now shows context-aware password management:
    - Users with a password see the existing "Change password" dialog
    - OAuth users (no password set) see a "Set password" component with email-based setup flow
  - **Improved Error Messages**: Enhanced `UpdatePasswordRequest` validator to detect users without a password and provide clear guidance: "This account has no password set. Please use the password reset option to set one."
  - **Seamless Password Setup**: OAuth users can now set their first password through the existing forgot-password flow (email link → set password)
  - **Inline Password Setup**: Improved UX for OAuth users by triggering password reset email directly from the "Set password" component without redirecting to the forgot-password page, showing success/error messages inline

### Fixed

- **Password Hashing**: Fixed a double-hashing issue in the password reset flow (`ResetUserPassword`) where the new `hashed` model cast conflicted with manual `Hash::make()`, causing login failures after reset.

### Added

- **Admin Panel Pet Relationships Management**:
  - **Full Relationship Representation**: Updated the "View Pet" page in admin panel to display all PetRelationships records (including expired ones) instead of just showing the creator as "Owner"
  - **RelationshipsRelationManager**: New relation manager for managing all pet relationships (Owner, Foster, Sitter, Editor, Viewer) with full CRUD operations
  - **Transfer Ownership**: Added bulk action to transfer ownership from current owners to a new owner with proper end/start dates
  - **End Relationship**: Added action to end active relationships (e.g., when foster period ends) while preserving historical records
  - **Streamlined Pet Form**: Removed redundant "Viewers" and "Editors" multiple-select fields from main pet form, now managed exclusively through relationships section
  - **Enhanced ViewPet Page**: Added "Current Relationships" section showing active Owners, Fosters, and Sitters with color-coded badges
  - **Updated PetResource Table**: Renamed "Owner" to "Creator" for clarity, added "Owners" column showing current active owners

### Added

- **Placement Request System Complete Migration (Phase 4)**:
  - **New Type System**: Introduced comprehensive type definitions in `frontend/src/types/placement.ts` for the new placement request data model:
    - `PlacementRequestResponse` - Helper responses to placement requests with status lifecycle (responded → accepted/rejected/cancelled)
    - `TransferRequest` - Physical handover confirmation objects for accepted responses
    - `PlacementRequestStatus` and `PlacementResponseStatus` enums with proper status transitions
    - Helper functions for formatting, status checking, and UI display

  - **API Layer Overhaul**: Complete replacement of legacy transfer_request-based APIs with clean response-based endpoints:
    - `getPlacementResponses()` - List responses for owner view
    - `submitPlacementResponse()` - Submit new helper response
    - `acceptPlacementResponse()` - Owner accepts response (creates TransferRequest for non-pet_sitting)
    - `rejectPlacementResponse()` - Owner rejects response
    - `cancelPlacementResponse()` - Helper cancels response
    - `confirmTransfer()` - Helper confirms physical handover
    - `rejectTransfer()` - Owner cancels accepted response

  - **Frontend Component Migration**: Complete UI migration from transfer_requests to responses:
    - **Owner View**: `PlacementRequestsSection.tsx` now shows responses with accept/reject actions and pending_transfer status
    - **Helper View**: `PlacementResponseSection.tsx` handles all response states (pending, accepted, active)
    - **Public Profile**: `PublicPlacementRequestSection.tsx` includes handover confirmation for accepted helpers
    - **Pet Card**: Updated to show user's response involvement status
    - **Responses Drawer**: Redesigned to show response details with message, timestamps, and profile access

  - **Backend Resource Updates**:
    - `PlacementRequestResponseResource.php` now includes `transfer_request` when response is accepted
    - New `TransferRequestResource.php` for clean transfer request serialization
    - Updated controllers to load both responses and transfer_requests relationships

  - **Data Model Consistency**: All mock data and test files updated to use new `responses` structure instead of legacy `transfer_requests`
  - **Type Safety**: Full TypeScript migration with proper type checking across all placement-related components

### Added

- **Notification System Complete Overhaul**:
  - **Restructured Notification Types**: Complete reorganization of notification types with clearer groupings:
    - `placement_owner`: Notifications for pet owners about their placement requests (new responses, cancellations, transfer confirmations)
    - `placement_helper`: Notifications for helpers about their responses (acceptance, rejection, placement ending)
    - `pet_reminders`: Pet health reminders (vaccinations, birthdays)
    - `account`: Account security notifications (email verification)
    - `messaging`: Chat/message notifications

  - **Improved Notification Labels & Descriptions**: Each notification type now has human-readable labels and detailed descriptions for better user understanding

  - **Enhanced Frontend Notification Settings Page**: Complete UI redesign with grouped, card-based layout:
    - Notifications grouped by category with icons (Heart for placement, Bell for reminders, etc.)
    - Each notification shows description explaining when it's triggered
    - Responsive design with proper mobile support
    - Visual hierarchy with group headers and consistent styling

  - **Context-Aware Notification Messages**: All placement-related notifications now provide clear, actionable messages:
    - **Owner receives**: "Someone wants to help with [pet name]. Review their response!"
    - **Helper receives**: "Great news! Your response was accepted. Please confirm when you receive the pet." (with handover context)
    - **Helper receives**: "Your offer for [pet] was declined. Thank you for your interest in helping!" (gentle rejection)
    - **Owner receives**: "[Helper] withdrew their response for [pet]." (clear cancellation notice)
    - **Owner receives**: "[Helper] has confirmed receiving [pet]. The placement is now active." (context-aware for permanent vs foster)
    - **Helper receives**: "The placement for [pet] has ended. Thank you for your help!" (gracious completion)

  - **Proper Notification Links**: Each notification links to the most relevant page:
    - Owner notifications → Pet profile page (`/pets/:id`)
    - Helper notifications → Public pet profile page (`/pets/:id/public`) for ongoing placements
    - Placement ended notifications → Requests page for browsing new opportunities

  - **Email Template Updates**: Created comprehensive email templates for all new notification types with:
    - Professional styling consistent with app branding
    - Clear call-to-action buttons linking to relevant pages
    - Contextual information about the pet and placement details
    - Helpful guidance and next steps for users

  - **In-App Notification Templates**: Bell notification templates for immediate alerts with concise, actionable messages

  - **Backend Infrastructure**: Complete update of notification service integration:
    - New Mail classes for `HelperResponseCanceledMail`, `TransferConfirmedMail`, `PlacementEndedMail`
    - Updated `SendNotificationEmail` job with proper mail class routing
    - Enhanced `NotificationMail` base class with smart URL resolution
    - Proper notification variable passing to templates

### Added

- **E2E Testing Infrastructure**:
  - Added comprehensive end-to-end test suite for pet creation functionality
  - Created `pet-creation.spec.ts` with full coverage of the pet creation user flow
  - Fixed global setup health check to work with actual backend endpoints (removed dependency on `/api/health`)
  - Improved login utility function to properly wait for authentication redirects
  - Updated `docs/e2e-testing-guide.md` with lessons learned from test development:
    - Added section on ensuring login functions wait for redirects
    - Documented complex form interaction patterns (city selection, dynamic components)
    - Included form validation testing examples
    - Added guidance on cleaning up debug artifacts
    - Provided real-world test example from pet creation
  - Tests validate complete pet creation workflow: form submission, backend processing, and UI updates

- **Placement Finalization & Relationship Updates**:
  - Implemented automatic relationship updates upon transfer confirmation:
    - **Permanent**: Ends former owner's relationship, creates new owner relationship for helper, and grants viewer access to former owner.
    - **Foster**: Creates new foster relationship for helper starting at confirmation time.
  - Added idempotency to transfer confirmation to prevent duplicate relationships on retries.
  - Updated foster finalization endpoint (`/api/placement-requests/{id}/finalize`) to end active foster relationships and support the refactored TransferRequest schema.
  - Integrated `NotificationService` for transfer confirmation and foster finalization notifications.
  - Added comprehensive feature tests for relationship transitions and finalization logic.

- **Transfer Request Refactoring**:
  - TransferRequest now belongs to PlacementRequest (not directly to Pet), enabling future support for multiple pets per placement request
  - Removed redundant `pet_id` and `requester_id` fields from TransferRequest (pet data accessible via placement request)
  - Renamed user fields for clarity: `initiator_user_id` → `from_user_id`, `recipient_user_id` → `to_user_id`
  - Renamed status and timestamp: `accepted` → `confirmed`, `accepted_at` → `confirmed_at`
  - New flow logic: TransferRequest created with `PENDING` status when owner accepts response for fostering/permanent placements
  - Helper confirms physical transfer receipt via new `/api/transfer-requests/{id}/confirm` endpoint
  - Pet sitting bypasses transfer entirely (goes directly to `ACTIVE` status)
  - Auto-rejection of other responses now happens at appropriate times: pet sitting (immediate) or transfer confirmation (fostering/permanent)
  - Added `TRANSFER_CONFIRMED` notification type for owner notifications
  - Updated all related controllers, policies, factories, tests, and Filament admin panels

### Added

- **Placement Request Response System**:
  - Introduced dedicated `placement_request_responses` table to track helper responses to placement requests
  - New `PlacementRequestResponse` model with state machine for response lifecycle: `responded` → `accepted`/`rejected`/`cancelled` (terminal states)
  - Response tracking includes timestamps for each state transition (`responded_at`, `accepted_at`, `rejected_at`, `cancelled_at`)
  - Helper can respond again after cancelling their response, but not after rejection
  - New `PlacementResponseStatus` enum with state transition validation methods
  - Updated `PlacementRequest` model with `responses()` relationship and helper methods for checking response eligibility
  - Updated `HelperProfile` model with `placementResponses()` relationship
  - Removed obsolete fields from `TransferRequest`: `helper_profile_id`, `requested_relationship_type`, `fostering_type`, `price`
  - Linked `TransferRequest` to `PlacementRequestResponse` via `placement_request_response_id` for better tracking.
  - New Filament admin relation manager for managing placement responses
  - Updated database seeders to create sample placement responses
  - New policy `PlacementRequestResponsePolicy` for authorization

### Fixed

- Fixed global typo in `PlacementRequestType` enum (`foster_payed` -> `foster_paid`).
- Fixed API contract mismatch caused by the typo.
- Fixed 41 ESLint errors across the frontend (e2e tests and multiple components). Key files updated include:
  - `frontend/e2e/pet-creation.spec.ts` (template literal numeric values made explicit)
  - `frontend/src/api/placement.ts` (added Axios response generics to avoid `any`)
  - `frontend/src/components/messaging/ChatWindow.tsx` (optional chaining improvements)
  - `frontend/src/components/notifications/NotificationPreferences.tsx` (nullish coalescing and grouping logic)
  - `frontend/src/components/pets/PetCard.tsx`, `PetRelationshipsSection.tsx` (removed non-null assertions and improved null checks)
  - `frontend/src/components/placement/public-profile/PublicPlacementRequestSection.tsx` (removed force-non-null assertions)
  - `frontend/src/pages/helper/HelperProfileViewPage.tsx` (normalized nullable fields)

  All changes are lint-compliant; `npm run lint -- --max-warnings 0` now passes.

### Removed

- **Placement Response Modal Components**: Removed deprecated modal-based placement response system in favor of the unified `/requests/:id` detail page experience:
  - Deleted `PlacementResponseModal.tsx` component
  - Deleted `PlacementResponseModal.test.tsx` test file
  - Deleted `usePlacementResponse.ts` hook
  - Deleted `PlacementResponseForm.tsx` and `PlacementResponseConfirm.tsx` form components
  - Updated `PlacementResponseSection.tsx` to navigate directly to request detail page instead of opening modal
- Deprecated `StoreTransferRequestController` and associated `/api/transfer-requests` POST endpoint in favor of the new placement response system.
  - Comprehensive documentation updates for the new response flow

### Changed

- **TransferRequest Model**: Cleaned up model by removing deprecated helper profile and relationship type fields
- **Placement Request Logic**: Response counting now uses `placement_request_responses` table instead of transfer requests
- **Filament Admin Panels**: Updated transfer request forms and relation managers to remove obsolete fields

### Removed

- **Rehoming Flow Models and Related Code**:
  - Removed `OwnershipTransfer`, `FosterAssignment`, `FosterReturnHandover`, and `TransferHandover` models
  - Removed `FosterAssignmentStatus` enum
  - Removed related controllers: `FosterAssignmentController`, `FosterReturnHandoverController`, `TransferHandoverController`
  - Removed `FosterAssignmentPolicy` and related Filament admin resources
  - Removed frontend API file `handovers.ts` and related components (`AcceptedSection`, `ScheduleHandoverModal`)
  - Removed API routes for handover lifecycle management
  - Added database migration to drop the related tables: `foster_assignments`, `foster_return_handovers`, `transfer_handovers`, `ownership_transfers`
  - Added TODO comments in affected code where the rehoming flow will need to be reimplemented when rebuilt

### Added

- **Pet Relationship System**:
  - Introduced a flexible relationship system supporting multiple relationship types: `owner`, `foster`, `editor`, and `viewer`.
  - Added `PetRelationship` model and `PetRelationshipType` enum for managing pet-user connections.
  - Implemented `PetRelationshipService` for handling relationship lifecycle (creation, ending, ownership transfer).
  - Added `pet-relationship-system.md` documentation detailing the new system.
  - Added `PetRelationshipFactory` and `CreatesPetsWithRelationships` trait for testing.
  - Added comprehensive unit and feature tests for the relationship system.
- **Helper Profile Status Management**:
  - Added `status` field to `HelperProfile` model with `active`, `archived`, and `deleted` states.
  - Added `archived_at` and `restored_at` timestamps to track profile status changes.
  - Implemented backend routes for archiving and restoring helper profiles.
  - Added "Archive" and "Delete" (with confirmation) buttons to the helper profile edit page.
  - Added status badges to helper profile view and list pages.
  - Implemented "Archived Profiles" section on the helper profiles list page.
  - Updated Filament admin panel to support viewing and managing helper profile status.
- **Multiple Cities per Helper Profile**:
  - Added `cities` many-to-many relationship to `HelperProfile` model, allowing helpers to specify multiple cities they serve.
  - Created `helper_profile_city` pivot table with migration that migrates existing single-city data.
  - Updated API endpoints (`POST`, `PUT`, `GET`) to handle `city_ids` array instead of single `city_id`.
  - Enhanced `CitySelect` component to support multiple city selection with tags interface.
  - Maintained backward compatibility by preserving `city` and `city_id` fields as comma-separated string and first city ID.
  - Updated form validation to require at least one city and ensure all cities belong to the selected country.
  - Added comprehensive tests for multiple cities functionality in `HelperProfileApiTest`.
- **Google OAuth & Invitation System Integration**:
  - Added "Sign in with Google" button to the registration page, allowing invited users to register via Google while preserving their invitation code.
  - Added automatic waitlist enrollment when attempting to register via Google in invite-only mode without a valid invitation.
  - Added frontend notifications for Google OAuth status: "Added to waitlist", "Already on waitlist", and "Waitlist failed".
- **Pet Creation and Selection**: Enhanced form validation and error handling for pet creation and selection.
- **Type Safety and Error Handling**: Improved type safety and error handling across various frontend components and hooks.
- **Deployment Script Logfile Cleanup**: Added `deploy_cleanup_logfiles()` function to clean up old logfiles in `.deploy` folder when using `--clean-up` flag. Keeps only the last 10 logfiles by modification time, freeing up disk space while preserving recent deployment history.

### Changed

- **Pet Ownership Refactoring**:
  - Renamed `user_id` to `created_by` in `pets` table to distinguish between pet creator and current owners.
  - Replaced simple ownership model with the new relationship system.
  - Migrated existing ownership, editor, viewer, and foster data to the new `pet_relationships` table.
  - Dropped legacy tables: `ownership_history`, `pet_viewers`, and `pet_editors`.
  - Updated `PetPolicy` to use relationship-based authorization.
  - Updated `PetResource` and API documentation to reflect schema changes.
  - Refactored numerous feature tests to use the new relationship-based helpers.
  - Updated documentation (`architecture.md`, `pet-profiles.md`, `placement-request-lifecycle.md`) to reflect the new relationship model.
- **Helper Profile Form**:
  - Removed "State/Province" field from the UI in `HelperProfileFormFields`.
  - Updated layout to display "Country" and "City" fields in a single row.
- **Google OAuth Flow**:
  - Updated `GoogleAuthController` to enforce invite-only registration rules and automatically accept invitations for new Google users.
  - Enhanced `LoginForm` to preserve `invitation_code` and `redirect` parameters during Google OAuth redirects.
- **Frontend Layout and Styling**:
  - Refactored `CitySelect` and `PetFormFields` for improved layout.
  - Updated class names for consistent styling in placement and invitations pages.
  - Adjusted button width in `DatePicker` component.
- **Frontend Hooks and Components**:
  - Enhanced type safety in hooks by specifying parameter types.
  - Updated `InvitationsPage` `loadData` function to handle optional parameters.
  - Adjusted placeholder in `TagsTrigger`.
- **Dependencies**: Updated npm packages and fixed `package-lock.json` dependencies.
- **Pet Profile Redirect Logic**: Users with viewer relationships are now redirected to the public pet profile page (`/pets/:id/view`), similar to pets with active placement requests. Added `is_viewer` flag to viewer permissions API response.

### Fixed

- **Helper Profile Restore**: Fixed `RestoreHelperProfileController` to load `cities` relationship instead of deprecated `city` relationship.
- **Invite-Only Registration**: Fixed a bug where Google login could bypass invite-only registration restrictions.
- **Backend**: Fixed type mismatch in password reset email route by using `SendPasswordResetLinkRequest` instead of generic `Request` in `backend/routes/api.php`.
- **Tests**: Updated `CreatePetPage` test to reflect changes in location fields visibility.
- **E2E Testing and Playwright Configuration Improvements**:
  - Fixed Playwright env file loading to correctly prioritize `frontend/` directory env files when tests are run from workspace root
  - Improved e2e-test.sh to detect existing services and avoid redundant startup (checks ports 8000 and 8025)
  - Added prerequisite validation in e2e-test.sh (docker, curl, npx commands)
  - Removed `-T` flag from initial docker compose exec commands in test setup, added back only where needed
  - Added proper error handling and exit codes in e2e-test.sh for better CI/CD integration
  - Fixed slowMo configuration in Playwright config to be environment-driven (PLAYWRIGHT_SLOWMO env var)
  - Moved e2e global setup logic from Playwright config to `global-setup.ts` for cleaner separation
  - Added `SKIP_E2E_SETUP=true` flag to use e2e-test.sh setup instead of Playwright's auto-setup

- **E2E Test Suite Refactoring and New Utilities**:
  - Created shared `frontend/e2e/utils/app.ts` with common test utilities: `gotoApp()`, `login()`, `openUserMenu()`
  - Refactored all e2e tests to use shared utilities instead of duplicated test helpers
  - Updated auth.spec.ts to use shared utilities and improved login flow testing
  - Updated registration-with-email-verification.spec.ts to use shared utilities and fixed email verification tests
  - Added new settings-account.spec.ts with comprehensive account settings tests (avatar upload, password change, account deletion)
  - Improved MailHog client with environment-driven API URL configuration

- **Frontend Package Scripts and Dependencies**:
  - Updated e2e and e2e:ui scripts to use e2e-test.sh wrapper for proper environment setup
  - Added e2e:direct script for direct Playwright execution (useful when services are already running)
  - Removed test:e2e:keep script in favor of e2e-test.sh --keep-running approach
  - Fixed Playwright config comment to reflect new default baseURL (http://localhost:8000 instead of localhost:5173)

- **Backend Authentication Rate Limiting**:
  - Enhanced FortifyServiceProvider to allow higher login/registration rate limits in dev/testing environments
  - Development environments (local, development, e2e, testing) now allow 100 login attempts per minute (up from 5)
  - Testing environments allow 10 registration attempts per minute for easier test execution

- **E2E Test Authentication Issues**:
  - Fixed authentication redirect loops preventing access to public pages (`/register`, `/login`, etc.)
  - Modified `AuthContext` to skip user loading on public pages, preventing unnecessary 401 responses
  - Updated unauthorized handler to exclude public paths from login redirects
  - Improved E2E test selectors to handle multiple elements with same role/name
  - Simplified E2E tests to focus on UI functionality rather than complex backend integration
  - Enhanced E2E test script to support Playwright CLI arguments (e.g., `--headed`, `--debug`, `--ui`)
  - Added slow motion configuration option in Playwright config for debugging

- **Owners cannot respond to their own placement requests**:
  - **Backend**: `StoreTransferRequestController` now returns `403 Forbidden` when a pet owner attempts to create a transfer request for their own pet; added/updated feature test `TransferRequestCreationTest::test_owner_cannot_create_transfer_request_for_own_cat`.
  - **Frontend**: `PetCard` and `PublicPlacementRequestSection` now hide or disable the "Respond" action for pet owners to avoid confusion; added UI test `PetCard.test.tsx` asserting owners do not see the "Respond" button.
  - **API / Compatibility**: `ShowPetController` and `ShowPublicPetController` include a `viewer_permissions.is_owner` flag and the `Pet` model exposes a backward-compatible `user_id` accessor where needed.

### Added

- **E2E Email Testing Infrastructure**:
  - Complete end-to-end testing setup with MailHog for email verification flows
  - `E2EEmailConfigurationSeeder` automatically configures MailHog as active email provider for testing
  - `E2ETestingSeeder` orchestrates all necessary seeders for complete test environment
  - MailHog API client (`frontend/e2e/utils/mailhog.ts`) for email interaction in tests
  - Automated test runner (`npm run test:e2e`) with service setup/teardown
  - Docker Compose profile for e2e services (MailHog + test database)
  - Email configuration verification command (`php artisan email:verify-config`)
  - Comprehensive e2e testing guide with troubleshooting and best practices
  - Real email verification flow testing with Playwright + MailHog integration

- **Google OAuth login/registration**:
  - Added Socialite-based Google auth flow with redirect/callback routes and SPA-safe redirects.
  - Users can sign in or create accounts with Google; existing email/password users are blocked from auto-linking and see `error=email_exists`.
  - Stored Google tokens/id/avatar on users; password is now nullable for social signups.
  - Frontend shows “Sign in with Google” plus error banner handling for `email_exists`, `oauth_failed`, and missing email responses. - Avatar handling refactored to use MediaLibrary: avatars are now downloaded and stored via Spatie MediaLibrary with proper validation, 5MB size limits, and content-type verification.- **City catalog per country**:
  - Introduced `cities` model/API (list + create) with approval workflow; pets and helper profiles now store `city_id` alongside the display name.
  - Backfilled existing pets/helper profiles into the city catalog and linked records.
  - Frontend city autocomplete for pet and helper profile forms (country-scoped with create-on-the-fly).
- **Requests page filters**:
  - Added City filter with autocomplete (country-dependent, no create) to `/requests`.
- **Helper profile pets section**:
  - Helper profile view now lists pets linked via placement requests, showing request type plus placement and transfer statuses with links to pet pages.
  - `helper-profiles/{id}` API now eager-loads transfer requests with related placement requests and pets.
  - Added unit tests for the new Pets section (linked pets and empty state).

- **Helper handover guidance**:
  - Acceptance notification now links helpers directly to the public pet page (`/pets/:id/public`) where they can confirm the handover.
- **Requests page sorting**:
  - Added created-at sort control (newest first or oldest first) to the `/requests` filters.

### Changed

- **Unauthorized handling**:
  - Any 401 API response now clears auth state and redirects to `/login?redirect=<path>` using shared axios interceptors, preventing stale sessions and error screens.
- **Helper profile updates**:
  - Updating a helper profile no longer requires sending `pet_type_ids` when only changing location/contact details.

- **Frontend pages restructuring**:
  - Reorganized `frontend/src/pages` into domain folders (`auth/`, `pets/`, `settings/`, `home/`, `placement/`, `invitations/`, `errors/`) for clearer ownership and imports.
  - Renamed settings screens to `AccountPasswordPage` and `NotificationSettingsPage`; updated routes and tests to match.
- **Pet create vs edit split**:
  - Separated pet creation and editing into dedicated pages (`CreatePetPage` and `EditPetPage`) with a shared `PetFormSection`.
  - Renamed edit-focused tests to `EditPetPage.*.test.tsx` to align with the new page.
- **Requests page visibility**:
  - Pets stay visible on the `/requests` page when their placement requests are in progress (`fulfilled`, `pending_transfer`, `active`, `finalized`) so accepted helpers can still access the public pet page and continue the flow.

- **Placement request completion flow**:
  - After creating a placement request, owners are redirected to `/requests?sort=newest` so they land on the latest-first view.
  - The requests page now syncs the created-date sort with the `?sort=` query param, defaulting to `newest` and preserving user selection in the URL.

- **Placement Request Auto-Rejection Timing**:
  - Moved auto-rejection of other pending helper offers from the "Accept Response" step to the "Complete Handover" step
  - Previously: Other offers were rejected when the owner accepted a response (PlacementRequest → `fulfilled`)
  - Now: Other offers remain pending until the handover is completed and status changes to `active` (fostering) or `finalized` (permanent rehoming)
  - This provides a backup option if the initially selected helper doesn't complete the handover
  - Rejected helpers are notified only when the transfer is actually confirmed

- **Helper profile pet type validation**:
  - Filament helper profile form now requires selecting at least one pet type for placement requests before saving.
  - Public API create/update endpoints now enforce at least one `pet_type_id` (required array with `min:1`).
  - Main app create/edit helper profile pages validate pet type selection client-side and show inline errors.

### Fixed

- **Remember me login**:
  - Login API now validates the `remember` flag and passes it to authentication so persistent cookies are issued when the box is checked.
- **Backend type-safety hardening**:
  - PhpStan now passes cleanly after tightening controller and command types (vaccination reminders, placement acceptance, pet listing).
  - Added stronger relation typing on models and factories to prevent undefined method/property access at runtime.
  - Updated web route view helpers to use typed view strings for safer rendering in SPA stubs.
- **Temporary fostering no longer transfers ownership**:
  - Handover completion now keys off `placement_request.request_type` (canonical) to decide between permanent vs fostering flows
  - Temporary fostering (`foster_free` / `foster_paid`) keeps the pet owner unchanged, creates/ensures a foster assignment, and sets placement status to `active`
  - Permanent rehoming still transfers ownership, closes prior ownership history, and finalizes the placement
  - Admin pet view continues to show the original owner for temporary fostering cases

### Added

- **Per-Pet Viewer/Editor Access Lists**:
  - Pets now support explicit “Users who can see this pet” and “Users who can edit this pet” lists
  - Backed by new pivot tables `pet_viewers` and `pet_editors` with model relationships and policy updates
  - Create/Update pet APIs accept `viewer_user_ids` and `editor_user_ids` to manage these lists
  - Filament pet form exposes multi-selects for viewers and editors
  - Tests: `PetViewerEditorAccessTest` covers creation, viewing, and editing permissions

- **Placement Response Modal Improvements**:
  - Removed "Relationship Type" dropdown - now automatically derived from placement request type
  - Auto-prefill "Helper Profile" dropdown when user has only one profile
  - Added validation to compare request type against helper profile's allowed request types
    - Shows destructive warning if type is not allowed and disables Submit button
  - Added location validation warnings:
    - City mismatch: Shows warning (non-blocking)
    - Country mismatch: Shows serious/destructive warning (non-blocking)
  - Automatically derive fostering type and price requirements from placement request type:
    - `foster_paid` → Fostering with "Paid" type (requires price input)
    - `foster_free` → Fostering with "Free" type
    - `permanent` → Permanent Foster

- **Placement Request Status Flow Enhancement**:
  - Implemented complete status lifecycle for placement requests:
    - `open` → `fulfilled` (when Owner accepts Helper's response)
    - `fulfilled` → `pending_transfer` (when Helper clicks "Confirm Rehoming")
    - `pending_transfer` → `finalized` (for permanent rehoming) OR `active` (for temporary fostering)
    - `active` → `finalized` (when Owner clicks "Pet is Returned" for temporary fostering)
  - Added "Confirm Rehoming" button for Helpers on public pet profile pages when their response is accepted
  - Added "Pet is Returned" button for Owners on pet profile pages for active temporary fostering
  - Updated `CompleteHandoverController` to properly set PlacementRequest status based on rehoming type
  - New `FinalizePlacementRequestController` endpoint: `POST /api/placement-requests/{id}/finalize`
  - Status badges and visual indicators throughout the UI showing current placement request state
  - Comprehensive status flow documentation updated in `docs/placement-request-lifecycle.md`

- **Helper Profile Pages UI Modernization**:
  - Updated `HelperProfilePage` (list view) with modern card-based design matching Pet Profile patterns
  - Updated `HelperProfileViewPage` with consistent navigation, status badges, and organized card sections
  - Updated `CreateHelperProfilePage` and `HelperProfileEditPage` with consistent navigation headers
  - Improved empty states, loading states, and error handling across all helper profile pages
  - Better visual hierarchy with icons, badges, and consistent spacing

- **Helper Profile Request Types & Visibility**:
  - Removed legacy boolean fields `is_public`, `can_foster`, and `can_adopt` from helper profiles.
  - Added new `request_types` array field on `helper_profiles` backed by the `PlacementRequestType` enum (`foster_paid`, `foster_free`, `permanent`).
  - Enforced validation so that helper profiles must have at least one `request_type` selected on create and update.
  - Updated backend model, controllers, factories, policies, Filament resource, and API schema to use `request_types`.
  - Updated frontend types, forms, pages, and tests to surface `request_types` as selectable chips/badges.
  - Implemented visibility rules for helper profiles:
    - Owners can always view their own helper profiles.
    - Pet owners can view helper profiles that have responded to their placement requests (via transfer requests linked to their pets).
    - Admins can view all helper profiles.
  - Updated helper profile listing and show endpoints to respect the new visibility logic.

- **Contact Info Field for Helper Profiles**:
  - Added new `contact_info` multiline text field to helper profiles, positioned after the phone number field
  - Helpers can add additional contact information (e.g., Telegram, Zalo, WhatsApp, preferred contact times)
  - Field includes a help icon with tooltip explaining that this info and phone number will be visible to pet owners when responding to placement requests
  - Contact info is displayed in:
    - Helper profile view page
    - Helper profile dialog (shown to pet owners when reviewing placement responses)
  - Database migration adds nullable `contact_info` text column to `helper_profiles` table
  - Backend validation allows up to 1000 characters
  - Updated documentation: new `docs/helper-profiles.md` with complete field reference

- **Public Pet Profile Endpoint and UI**:
  - New `/api/pets/{id}/public` endpoint for accessing pet profiles publicly (for guests and non-owners)
  - Public profiles are accessible for:
    - Pets with status "lost" (always publicly viewable)
    - Pets with active (OPEN) placement requests
  - Whitelisted fields returned in public view: id, name, sex, birthday data, location (no exact address), description, status, pet type, categories, photos, placement requests, and viewer permissions
  - New `ShowPublicPetController.php` backend controller implementing public profile access with field filtering
  - New `PetPolicy::isPubliclyViewable()` method determining public visibility logic
  - New frontend routes and components:
    - Route `/pets/:id/public` for public pet profile page (`PetPublicProfilePage.tsx`)
    - `PublicPlacementRequestSection.tsx` component for displaying placement requests on public profiles
    - Automatic redirect from `/pets/:id` to `/pets/:id/public` for non-owners viewing publicly viewable pets
  - Owner viewing their own public profile sees banner: "You are viewing the public profile of your pet."
  - Lost pets show warning banner: "This pet has been reported as lost..."
  - Comprehensive documentation: new `docs/pet-profiles.md` explaining access control, routing logic, and API endpoints
  - Test coverage: `PublicPetProfileTest.php` and `PetPublicProfilePage.test.tsx` with 13+ test cases

- **Login Prompt for Placement Requests**:
  - "Respond" button on pet cards is now visible to all users (not just logged-in users)
  - Non-authenticated users clicking "Respond" see a modal with "Please login to respond" message
  - Modal includes "Login" and "Cancel" buttons
  - "Login" button redirects to login page with return URL parameter (`/login?redirect=/pets/:id`)
  - After successful login, users are automatically redirected back to the pet profile page
  - Existing login redirect functionality already supported this pattern with security validation

- **Enhanced Filters on Requests Page**:
  - Added **Request Type filter** with options: All Request Types, Foster (Paid), Foster (Free), Permanent
  - Added **Country filter** dynamically populated from available pets, sorted alphabetically with human-readable country names
  - Improved **date filters** with comparison operators:
    - Renamed "Start Date" to "Pickup Date" and "End Date" to "Drop-off Date"
    - Added comparison select dropdowns (Before/On/After) for both pickup and drop-off dates
    - Pickup Date filters on `placement_request.start_date` field
    - Drop-off Date filters on `placement_request.end_date` field
    - Drop-off Date filter is automatically hidden when "Permanent" request type is selected
  - Filters are organized in a cleaner two-row layout for better usability

- **Logout confirmation in Main Menu**:
  - Clicking "Log Out" from the user avatar menu opens a confirmation dialog with "Cancel" and "Log Out" actions
  - Confirming the action logs out the current user and redirects to `/login`; cancelling closes the dialog
  - Frontend: `UserMenu` component now uses `AlertDialog` to display the confirmation
  - Tests: Updated unit tests and e2e tests to assert dialog behavior and logout flow

### Changed

- **Placement Request Status Update**: Replaced `PENDING_REVIEW` status with `FINALIZED`
  - Updated enum `PlacementRequestStatus` in backend
  - Updated all UI labels and filters across Filament admin panel
  - Updated API database queries for active request checks
  - Updated frontend logic for determining active placement requests
  - Affected files:
    - Backend: `PlacementRequestStatus.php`, `PlacementRequestResource.php`, `StorePlacementRequestController.php`, `PlacementRequestExporter.php`
    - Frontend: `PetCard.tsx`, `RequestsPage.tsx`, `usePlacementInfo.ts`

### Fixed

- **Pet Cards Visibility on Requests Page**:
  - Made `/api/pet-types` endpoint public so non-logged-in users can view Pet Cards on the `/requests` page
  - Previously, the endpoint was protected by `auth:sanctum` middleware, causing the page to fail for unauthenticated users
  - Moved `/api/pet-types` route to public routes section to allow access without authentication

- **Pet Profile Page Visibility for Non-Logged-In Users**:
  - Made pet health data endpoints (medical records, vaccinations, weights, medical notes, microchips) publicly readable
  - GET endpoints now use `optional.auth` middleware, allowing non-logged-in users to view pet profiles without errors
  - Write operations (POST/PUT/DELETE) still require authentication
  - Previously, visiting `/pets/:id` as a non-logged-in user showed "Failed to load medical records" error

### Added

- **Pet Sex Field**:
  - Added `sex` field to Pet model with options: Male, Female, and Not Specified (default)
  - Sex field available in pet creation (`/pets/create`) and edit (`/pets/:id/edit`) forms
  - Sex displayed on pet profile page (`/pets/:id`) and pet cards
  - Sex field shown only when value is not "Not Specified" (Male/Female displayed)
  - Database migration adds `sex` column with default value `'not_specified'`
  - Backend enum `PetSex` with label() method for human-readable labels
  - Admin panel (Filament) includes sex field in pet form and table with color-coded badges
  - API endpoints updated to accept and return sex field
  - Factory and seeders updated to include sex values

- **Pet Categories System**:
  - Category model for tagging pets with breed, type, and other characteristics
  - Categories are pet-type-specific (cats have different categories than dogs)
  - Dual-mode creation: administrators create via admin panel, users create on-demand during pet creation/editing
  - Approval workflow: user-created categories require admin approval before general visibility
  - API endpoints: `GET /api/categories` (search/filter) and `POST /api/categories` (create)
  - Admin panel at Admin → System → Categories with full CRUD, bulk approval actions, and usage tracking
  - CategorySelect React component with autocomplete, search, and inline category creation
  - Multi-select support with max 10 categories per pet
  - "Pending" badge indicator for unapproved categories
  - Comprehensive database schema with unique constraints and pivot table for pet-category relationships
  - 30+ pre-seeded categories for cats and dogs (all approved)
  - Full feature test coverage (18 tests, 49 assertions, all passing)
  - Comprehensive documentation at `/docs/categories.md`

- **Standardized Location Fields**:
  - Pet and HelperProfile models now use consistent location fields: Country (required), State, City, and Address (optional)
  - Country field uses ISO 3166-1 alpha-2 codes (2-character country codes, e.g., 'VN' for Vietnam)
  - New `CountrySelect` component with searchable dropdown featuring all countries (using `i18n-iso-countries` package)
  - Vietnam set as default country in pet creation form
  - Pet location display shows formatted "City, State, Country" on profile pages
  - Email templates updated to display structured location format

- **Placement Terms & Conditions System**:
  - New placement terms document stored in `backend/resources/markdown/placement-terms.md`
  - API endpoint `GET /api/legal/placement-terms` to serve terms with version tracking
  - PlacementTermsDialog component displaying terms in a scrollable modal
  - PlacementTermsLink component for easy inline access to full terms
  - Mandatory checkbox in Placement Request modal requiring users to accept terms before submission
  - Comprehensive terms covering authorization, information accuracy, health disclosure, liability, and legal compliance
  - Version dating based on file modification time with 1-hour HTTP cache

- **Placement Request Enhancements**:
  - Public profile visibility warning checkbox - users must acknowledge pet profile will become publicly visible
  - Date validation: Pick-up date cannot be in the past (today is allowed)
  - Date validation: Drop-off date must be on or after pick-up date
  - Calendar components now disable invalid dates (past dates for pick-up, dates before pick-up for drop-off)
  - Validation error messages displayed below date fields when invalid dates are selected
  - Submit button disabled when dates are invalid or required checkboxes not accepted

- **Medical Records feature**: Full CRUD functionality for pet medical records
  - Backend API endpoints for creating, reading, updating, and deleting medical records
  - Support for record types: vaccination, vet visit, medication, treatment, and other
  - Optional fields for vet name and attachment URL
  - Medical Records section on Pet Profile page (view mode) and Pet Profile Edit page (edit mode)
  - Card-based UI consistent with other health sections (Weight History, Vaccinations)
  - Icon buttons (Pencil for edit, Trash for delete) in edit mode
  - Filtering and sorting by date (most recent first)
  - Color-coded badges for different record types
- Pet photo gallery with carousel on edit pet page - view all uploaded photos in a thumbnail grid.
- Full-size photo modal with carousel navigation for viewing pet photos.
- "Set as Avatar" button in photo modal to choose which photo is the pet's avatar.
- "Delete" button in photo modal to remove individual photos.
- Star badge on primary photo thumbnail to indicate current avatar.
- Newly uploaded photos are automatically set as the pet's primary photo.

### Changed

- **Pet Model Schema**:
  - Removed `breed` field from Pet model (replaced by Categories system for more flexible tagging)
  - Pet breed information can now be stored using the Categories system (e.g., "Siamese", "Persian" categories)
  - Pet profile displays now show pet type name instead of breed
  - Database migration removes `breed` column from pets table
  - API endpoints no longer accept or return breed field
  - Admin panel (Filament) removed breed field from pet form and table

- **Placement Request Display Refactor**:
  - PlacementRequestsSection now uses improved card-based styling with badges for request types
  - Request types formatted as human-readable labels: "Foster (Free)", "Foster (Paid)", "Permanent Adoption"
  - Request type badges color-coded: default for permanent, secondary for fostering, outline for others
  - Response count displayed with Users icon showing number of pending responses
  - Expiration date displayed with Clock icon for better visual hierarchy
  - Delete button changed to ghost icon button with Trash icon for cleaner design
  - Improved spacing and visual consistency across request cards

- **Helper Profiles Page Redesign**:
  - Changed from table layout to modern card-based design matching app's design system
  - Added back button navigation consistent with other pages
  - Location displayed with MapPin icon showing "City, State" format
  - Public/Private status shown as badges with Eye/EyeOff icons
  - Edit button changed to ghost icon button with Pencil icon
  - Improved loading and error states using LoadingState and ErrorState components
  - Empty state with call-to-action button when no profiles exist
  - Better responsive layout on mobile devices

- **Placement Response Section Styling**:
  - ResponseSection now uses card-based styling with improved visual hierarchy
  - Helper profile displayed with user avatar placeholder and User icon
  - "View Profile" button now includes Eye icon for clarity
  - Responsive button layout (stacks on mobile, inline on desktop)
  - PlacementResponseSection updated with matching card styling
  - Request type displayed as badge in header for visual consistency
  - Pending state shows Clock icon with descriptive text
  - Cancel button includes X icon for better usability
- Entire pet card is now clickable to navigate to pet profile page (previously only photo was clickable).
- Vaccination status badge on pet cards showing "Up to date", "Due soon", "Overdue", or "No records" (for pet types that support vaccinations).
- Placement Requests now displayed in a Card component on Pet Profile page for consistency with other sections.

### Changed

- **Placement Request Modal Labels**: "Start Date" renamed to "Pick-up Date" and "End Date" renamed to "Drop-off Date" for clarity (database field names unchanged)
- Replaced "Meo!" text with Cat icon in the top navigation bar.
- Replaced "Requests" text with PawPrint icon in the top navigation bar.
- Section order on Pet Profile Edit page: Weight History now appears before Vaccinations.
- "Add New Weight Entry" button now shows in both view and edit modes.
- Placement Requests button text changed to "+ Add Placement Request" for consistency.

### Fixed

- Pet photos now display correctly immediately after upload (fallback to original when conversions aren't ready).
- Date picker now includes year and month dropdowns for easier selection of past dates.
- Description and location fields are now optional when creating a pet (can be added later in edit mode).
- Medical records table migration added `pet_id` foreign key column.

### Changed

- **Pet Location Structure**: Replaced single `location` text field with structured `country`, `state`, `city`, and `address` fields
- **HelperProfile Location Fields**: Made `state`, `city`, `address`, and `zip_code` fields optional (previously some were required)
- Description and location fields are hidden from pet creation form (accessible via edit page).
- **Pet Profile Public Page Renamed**: Renamed `/pets/:id/public` route to `/pets/:id/view` with expanded access control:
  - **Pet owners** can now always view their pet profiles (previously required active placement requests)
  - **Users with PetRelationship** (`owner` or `viewer` types) can view pet profiles
  - **Helpers involved in pending transfers** can view pet profiles when placement request status is `pending_transfer`
  - **Public access** preserved for lost pets and pets with active placement requests
  - Updated all notification links and frontend routing to use the new `/view` endpoint
  - Enhanced `PetPolicy` with `isPendingTransferRecipient()` method for transfer-based access control

### Changed

- Updated seed user name for support user to "Support 🐱"

### Added

- Added "Chat with Support" button in settings page that creates a conversation with support user (ID 2)

### Fixed

- Fixed syntax error in SettingsPage.tsx where two lines were merged
- Fixed useCreateChat hook destructuring and usage in SettingsPage.tsx
- **Placement Request Notification Links**: Fixed placement request notifications to link to `/requests/:id` instead of `/pets/:id` and added `placement_request_id` to notification data for better deep-linking.

### Changed

- **Helper Profile Placement Requests Section**: Rewrote the 'Placement Responses' section on `/helper/:id` to display a simplified list of related Placement Requests instead of detailed pet cards with transfer actions. Each item now shows owner name, pet name, responded date, status, and a badge indicating "Waiting" or "Action required" (when the request is in 'pending_transfer' status with a pending owner-to-helper transfer). Removed all transfer confirmation actions from the page. Added ChevronRight icons to match the `/helper` list style. Updated backend API to include owner information for display.

### Added

- **Placement Request Page**: Show "Your Response" section to potential helpers who haven't created a Helper Profile yet, with a prompt to create one.

### Changed

- **Pet Profile Placement Requests UI**: Simplified the Placement Requests section on pet profile pages by removing create and delete action buttons, replacing them with a clickable list displaying placement requests with status badges, matching the style of the helper profile page.

- **Request Details Helper Access**: Enhanced the request details page by making helper names in the Responses section clickable, opening a helper profile drawer for owners to view helper information directly.

- **Responses Drawer UI Improvements**: Added ChevronRight icon to helper names for better visual indication of clickability, removed the back button from the drawer for a cleaner interface, and changed photo display from static images to a carousel for better viewing experience.
