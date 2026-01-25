# History

This file contains the changelog for older versions of the project.

## [v0.6.0] - 2026-01-22

### Added

- **Email Log Status Management**: Introduced comprehensive email delivery status tracking with `EmailLogStatus` enum supporting pending, accepted, delivered, failed, and bounced states for better email monitoring and debugging.

- **Helper Profile Approval System**: Added approval workflow for helper profiles with `HelperProfileApprovalStatus` enum including pending, approved, rejected, and suspended states for better content moderation.

- **Invitation Status Management**: Enhanced invitation system with `InvitationStatus` enum tracking pending, accepted, expired, and revoked states for improved invitation lifecycle management.

- **Waitlist Entry Status Management**: Added status tracking for waitlist entries with `WaitlistEntryStatus` enum supporting pending and invited states.

- **Medical Records System**: Complete CRUD system for pet medical records including:
  - MedicalRecord model with support for vaccination, medical notes, surgery, prescription, diagnosis, and other record types
  - Full admin panel interface for managing pet medical records with veterinarian details and file attachments
  - Support for PDF and image attachments up to 5MB
  - Date-based sorting and filtering capabilities

- **Pet Comments System**: Added commenting functionality for pets with:
  - PetComment model linking comments to specific pets and users
  - Admin panel for managing pet comments with full CRUD operations
  - Author and pet filtering capabilities

- **Pet Microchip System**: Introduced microchip tracking for pets with:
  - PetMicrochip model for storing microchip information including chip number, manufacturer, and implantation details
  - Admin panel interface for managing microchip records
  - Relationship to pets for comprehensive pet identification tracking

### Changed

- **PWA Update Handling**: Refactored service worker registration into a dedicated module to prevent test side effects and improved update detection reliability.

- **Frontend Tests**: Fixed routing tests to prevent timeouts by removing redundant waitFor wrappers and adjusting assertions for lazy-loaded routes.

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

- **Database Seeder Weight Histories**: Fixed the `DatabaseSeeder` to generate realistic weight progression for cats and dogs, ensuring weights stay within species-appropriate ranges (cats: 2.6-6.8kg, dogs: 4.0-32.0kg), with a maximum 3% change between consecutive measurements for smooth, natural progression over time.

### Changed

- **Deploy Script Fresh Mode**: Updated `utils/deploy.sh` to rebuild Docker images during `--fresh` deployments, ensuring seeding runs with the latest code instead of stale container images.

### Added

- **Deploy Script Skip Build Flag**: Added `--skip-build` flag to `utils/deploy.sh` to optionally skip Docker image and documentation builds, allowing faster deployments when using existing local images. Updated help text and usage examples accordingly.

- **PostgreSQL Schema Compatibility**: Removed `SET transaction_timeout = 0;` from `pgsql-schema.sql` to fix "unrecognized configuration parameter" errors during parallel testing, as the schema was dumped with pg_dump 17 but Docker uses PostgreSQL 14.

### Changed

- **Test Database Configuration**: Improved test database setup for better parallel testing:
  - Made `backend/scripts/init-test-db.sh` configurable via `POSTGRES_TEST_DB` environment variable with default `meo_mai_moi_testing`
  - Updated default test database name from `meo_mai_moi_test` to `meo_mai_moi_testing` to avoid confusing double suffixes like `meo_mai_moi_test_test_1`
  - Updated `phpunit.xml`, `docker-compose.yml`, and related docs to use the new naming convention

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

### Changed

- **Frontend Performance Optimizations**: Implemented code splitting and lazy loading to improve initial bundle size and loading times:
  - Added lazy loading for page components in App.tsx with Suspense fallback using a new PageLoadingSpinner component
  - Lazy loaded WeightChart and InvitationQRCode components with Suspense fallbacks
  - Made Echo/Reverb initialization async and dynamic to avoid loading pusher-js and laravel-echo when not configured
  - Added manual chunk splitting in Vite config for better caching of vendor libraries
  - Added bundle analysis tool with rollup-plugin-visualizer and build:analyze script

## [0.5.0] - 2025-11-30

### Added

- **Frontend: Microchips on Pet Edit Page**: Integrated microchips management into the pet edit page
  - Microchips section now appears in the General tab of `/pets/:id/edit` page
  - Only displays when the pet type has microchips enabled (configurable in Settings → Pet Types)
  - Users can add, edit, and delete microchips with chip number (required, min 10 chars), issuer (optional), and implantation date (optional)
  - Microchips cannot be added during pet creation, only after the pet is created

### Fixed

- **Frontend: Toast (Sonner) Dark/Light Mode Switching**: Fixed toasts always showing in dark mode
  - Changed sonner component to use project's custom `@/hooks/use-theme` instead of Next.js-specific `next-themes`
  - Toasts now correctly respond to theme changes and respect user's dark/light mode preference

- **Frontend: Date Picker Styling Reset**: Resolved date picker styling issues by removing react-day-picker default class names and implementing full Tailwind CSS styling
  - Simplified Calendar component to use only Tailwind classes without conflicting rdp-\* default classes
  - Set fixed cell dimensions (h-9 w-9 = 36px) for proper calendar grid layout
  - Updated component to use react-day-picker v9 API with correct class names (month_caption, month_grid, day_button, etc.)
  - Improved weekday header and date cell rendering with consistent button styling
  - Now matches shadcn/ui demo appearance with proper spacing and cell sizes

### Removed

- **Frontend: Removed unused `next-themes` dependency**: Cleaned up unused package that was part of shadcn/ui sonner template but not used in this Vite project

### Added

- **Vaccination Record Renewal System**: Complete refactor of vaccination record lifecycle management
  - Added `completed_at` timestamp to mark vaccination records as completed/renewed instead of deleting them
  - Completed records are archived and no longer trigger reminders
  - New endpoint `POST /api/pets/{pet}/vaccinations/{record}/renew` marks old record as completed and creates new one
  - Backend scopes: `->active()` for active records, `->completed()` for historical records
  - Backend helper methods: `isActive()`, `isCompleted()`, `markAsCompleted()`
  - Updated `SendVaccinationReminders` command to only send reminders for active (non-completed) records
  - Updated vaccination list endpoint with `status` parameter: `active` (default), `completed`, or `all`

- **Frontend: Vaccination Renewal UI**
  - Added "Renew" button on each vaccination record (highlighted for overdue vaccinations)
  - Renew modal pre-fills form with today's date, same vaccine name, and auto-calculated next due date based on vaccination interval
  - Users can modify all fields before saving
  - New utility functions: `isActiveVaccination()`, `getActiveVaccinations()`, `getVaccinationIntervalDays()`, `calculateNextDueDate()`
  - Added "Show History" toggle in vaccination edit mode to display completed/renewed records
  - Completed records show with "Renewed" badge, strikethrough due date, and read-only mode

- **Background Job Scheduling Infrastructure**: Implemented Laravel Scheduler + Database Queue for background task processing
  - Added `scheduler` supervisor program running `schedule:run` every 60 seconds
  - Added `queue-worker` supervisor program for async job processing with retries
  - Updated `docker-entrypoint.sh` to create log files for scheduler and queue worker
  - Updated `.env.example` with `QUEUE_CONNECTION=database` as default for production
  - Documented background jobs architecture in `docs/architecture.md`

- **Vaccination Reminder Notifications**: Automated daily reminders for upcoming pet vaccinations
  - `SendVaccinationReminders` command sends reminders 3 days before vaccinations are due
  - Groups multiple vaccinations per pet into a single notification (e.g., "Shaniya is due for Rabies, FVRCP, and FeLV")
  - Respects user notification preferences (email/in-app toggles on `/settings/notifications`)
  - Includes pet name and link to pet profile page for easy access
  - Prevents duplicate reminders via `reminder_sent_at` tracking on vaccination records
  - Scheduled daily at 09:00 server time via Laravel Scheduler

### Changed

- **Frontend: Pet Creation Route Updated**: Changed pet creation route from `/account/pets/create` to `/pets/create` for consistency with the new route structure. Old route redirects to new one for backward compatibility.

- **Frontend: Notification Settings UX Improvement**: Replaced custom "Settings saved" alert with standard toast notification for better consistency and user experience.

- **Home Page Now Shows My Pets for Authenticated Users**
  - Moved `/pets` (My Pets page) functionality to `/` route for logged-in users
  - Unauthenticated visitors still see the landing page at `/`
  - Added redirect from `/account/pets` → `/` for backwards compatibility
  - Updated all post-login redirects to go to `/` instead of `/account/pets`
  - Updated email verification success redirects to `/?verified=1`
  - Updated "My Pets" link in user menu to point to `/`
  - This change makes the core functionality (managing pets) the primary experience

- **Frontend: Inline Edit for Weight and Vaccination Records**
  - Added pencil (edit) icon button to each weight record in the Weight History card
  - Added pencil (edit) icon button to each vaccination record in the Upcoming Vaccinations section
  - Clicking edit shows inline form with current values for modification
  - Improved UX with consistent icon placement alongside delete button

- **Frontend: Notifications API No Longer Polled for Unauthenticated Users**
  - Added authentication check to notification polling effect in `NotificationProvider`
  - Prevents unnecessary 401 errors on `/api/notifications` endpoint
  - Reduces server load by avoiding polling requests from anonymous visitors

- **Frontend: Pet Management UI Refactoring**
  - Removed password requirement from pet status update endpoint (`updatePetStatus`)
  - Updated `PetStatusControls` component to show confirmation dialog without password field
  - Refactored `PetDangerZone` component with improved state management
  - Added dedicated hooks for pet editing: `useEditPet`, `useEditPetActions`, `usePetForm`
  - Created reusable `PetFormCard` component for consistent form presentation
  - Separated edit page functionality into proper tabs (General, Health, Status)
  - Simplified password-based operations (only pet deletion requires password confirmation)

- **Backend: Pet Status Update REST Semantics**
  - Removed password parameter from `PUT /api/pets/:id/status` endpoint
  - Status update no longer requires password confirmation (non-destructive operation)
  - Pet deletion (`DELETE /api/pets/:id`) still requires password for security

### Changed

- **Pet Profile Page Redesign**: Complete UI overhaul matching mobile-first design
  - Custom header with Back/Edit buttons (hides global nav on this page)
  - Circular pet photo with green border and vaccination status badge
  - Weight History card with interactive line chart (Recharts)
  - Upcoming Vaccinations section with due date display
  - Simplified Placement Requests button at bottom
  - Theme-aware styling (supports light/dark modes)
  - Removed complex owner-only sections (medical notes, microchips moved to edit page)

### Added

- **Weight Chart Visualization**: New `WeightChart` component using Recharts library
  - Line chart with date labels on X-axis
  - Last point label showing current weight
  - Interactive tooltips on hover
  - Handles string-to-number conversion from API

- **Vaccination Status System**: Calculate and display vaccination status
  - `VaccinationStatusBadge`: Shows Up to date (green), Due soon (yellow), Overdue (red), No records (gray)
  - `calculateVaccinationStatus()`: Determines status from vaccination records
  - `getUpcomingVaccinations()`: Filters and sorts vaccinations by due date

- **Conditional Navigation Hiding**: MainNav hidden on `/pets/:id` routes
  - Pattern-based route matching in App.tsx
  - Custom header renders within PetProfilePage instead

- **New Test Suites**: Comprehensive test coverage for new components
  - `vaccinationStatus.test.ts`: Unit tests for status calculation utilities
  - `VaccinationStatusBadge.test.tsx`: Component rendering tests
  - `WeightChart.test.tsx`: Chart rendering and data handling tests
  - `WeightHistoryCard.test.tsx`: Integration tests with MSW mocks
  - `UpcomingVaccinationsSection.test.tsx`: Integration tests with callback testing
  - Updated `App.routing.test.tsx`: Tests for hidden nav on pet profile

### Removed

- **Legacy Components**: Cleaned up replaced components
  - Removed `WeightHistorySection.tsx` (replaced by `WeightHistoryCard`)
  - Removed `VaccinationsSection.tsx` (replaced by `UpcomingVaccinationsSection`)

### Fixed

- **Weight Chart Crash**: Fixed `weight_kg.toFixed is not a function` error
  - API returns weight_kg as string, now converted with `parseFloat()`

- **Vaccination Badge Not Updating**: Badge now refreshes after adding vaccinations
  - Added version key to force re-render on vaccination changes
  - `onVaccinationChange` callback passed from parent to section

---

- **🔥 HIGH IMPACT: Invokable Controller Architecture Migration**: Refactored all multi-method API controllers into dedicated single-action (invokable) classes
  - Migrated 21 controllers to invokable pattern following Single Responsibility Principle
  - Each controller action is now a dedicated class with `__invoke()` method
  - Controllers organized into domain-specific directories (Pet/, Notification/, TransferRequest/, etc.)
  - OpenAPI schema definitions moved from controllers to Model files for better organization
  - Updated routes in `api.php` and `web.php` to use new invokable controllers
  - All 659 tests passing with zero breaking changes
  - **Deleted Controllers**: AdminController, AuthController, EmailVerificationController, FosterAssignmentController, FosterReturnHandoverController, HelperProfileController, InvitationController, MedicalNoteController, NotificationController, NotificationPreferenceController, PetController, PetMicrochipController, PetPhotoController, PlacementRequestController, SettingsController, TransferHandoverController, TransferRequestController, UserProfileController, VaccinationRecordController, WaitlistController, WeightHistoryController
  - **New Controller Directories**: Admin/, Auth/, EmailVerification/, FosterAssignment/, FosterReturnHandover/, HelperProfile/, Invitation/, MedicalNote/, Notification/, NotificationPreference/, Pet/, PetMicrochip/, PetPhoto/, PlacementRequest/, PushSubscription/, Settings/, TransferHandover/, TransferRequest/, Unsubscribe/, UserProfile/, VaccinationRecord/, Waitlist/, WeightHistory/

- **Deployment Scripts**: Enhanced CI/CD pipeline with three major improvements:
  - **Disk Space Monitoring**: Added automatic disk space check at deployment start with warning threshold (10% free space by default, configurable via `DEPLOY_DISK_THRESHOLD`)
    - Shows prominent warning box if disk space is low
    - Includes disk usage details in Telegram deployment notifications
  - **Interactive Empty Database Handler**: Replaced hard exit with user-friendly interactive menu when empty database is detected before deployment
    - Option 1: Seed the database (recommended for fresh setups)
    - Option 2: Proceed without seeding (not recommended - requires explicit confirmation)
    - Option 3: Cancel deployment gracefully
    - Non-interactive mode (`--no-interactive`) still exits with helpful error message
  - **Docker Cleanup Flag** (`--clean-up`): New optional flag to clean up old Docker images, containers, and build cache after successful deployment
    - Removes stopped containers and dangling images
    - Prunes unused images older than 24 hours
    - Cleans build cache older than 7 days
    - Reports final Docker disk usage summary
    - Can significantly free disk space (tested: 4.5GB→1.3GB)
  - **Removed Automatic Cache Forcing**: No longer automatically enables `--no-cache` when using `--skip-git-sync` flag; gives users full control over caching behavior

### Added

- **Frontend: Vaccination Tracking UI Components**
  - `VaccinationStatusBadge`: Shows vaccination status (Up to date, Due soon, Overdue, No records)
  - `UpcomingVaccinationsSection`: Lists upcoming vaccinations with due dates, color-coded for priority
  - `vaccinationStatus.ts` utility: Calculates overall status and filters upcoming vaccinations
  - Integrated into pet profile page alongside weight tracking
  - Color-coded status indicators: green (up to date), yellow (due soon), red (overdue), gray (unknown)

- **Frontend: Weight Tracking Visualization**
  - `WeightHistoryCard`: Card component displaying weight history with add/edit capability
  - `WeightChart`: Line chart visualization using Recharts library
  - Chart features: Interactive tooltips, date labels, last point emphasis
  - `WeightHistoryCard`: Integrates weight form for adding new entries
  - Shows weight trends over time with formatted display

- **Dependencies: Recharts Library**
  - Added `recharts@^2.15.4` for professional chart visualizations
  - Includes all D3 charting dependencies for advanced data visualization capabilities
  - `recharts-scale`, `decimal.js-light`, and D3 modules for precise calculations

- **Frontend: Chart UI Components**
  - `chart.tsx`: Shadcn-ui compatible charting component with ChartContainer, ChartTooltip, ChartLegend
  - Supports theme-aware color configuration (light/dark modes)
  - Responsive container with proper styling and accessibility

- **Frontend: Card Component Enhancements**
  - New `CardAction` slot for action buttons in card headers
  - Updated card styling with flex layout and gap system
  - Improved container query support for responsive design

- **Backend: Weight History Relation Manager**
  - `WeightHistoriesRelationManager` in PetResource for managing weight records
  - Table view with weight, date, and creation timestamp columns
  - Form to add/edit weight entries with validation (0.01-500 kg range)
  - Default sort by date (newest first)
  - Empty state with helpful message and icon

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

- **PetProfilePage Refactoring**: Simplified page layout and improved mobile responsiveness
  - Removed complex owner-only UI sections for better maintainability
  - New sticky header with back button and edit option
  - Clean card-based layout for pet information and related features
  - Integrated new weight history and vaccination tracking components
  - Responsive design optimized for mobile and tablet displays

- **PetResource (Backend)**: Added WeightHistoriesRelationManager to relation managers
  - Enables managing weight records directly from pet detail view in Filament

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
  - **Reliable update mechanism** with automatic cache cleanup (`cleanupOutdatedCaches`)
  - **Update notifications**: Toast prompts users when new version is available
  - **Periodic update checks**: Hourly checks for long-running sessions
  - **iOS/Safari support**: Focus-based update checks for better mobile experience
  - **Proper cache headers**: nginx configured to never cache service worker files
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

- Removed the "Verify your email" reminder from the bell notifications (filtered out `email_verification` type in notifications API).
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
- Email pipeline resilience: `SendNotificationEmail` no longer throws when email isn't configured; it logs, marks the notification failed, and creates an in-app fallback instead (prevents 500s during registration).
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
- **Notification Settings**: Removed "Email Verification Required" from the list of configurable notification types in user settings, as this is a mandatory system notification.
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

## [0.4.0] - 2025-09-28

### Added

- **Database Schema Squashing**: Squashed all historical migrations into a single `pgsql-schema.sql` file to speed up test runs and simplify new environment setups.
- **Multi-pet support**: The application now supports multiple pet types, including cats and dogs.
- **Pet type capabilities**: A new `placement_requests_allowed` feature has been added to control which pet types can have placement requests.
- **Helper pet types**: Helpers can now specify which pet types they are able to help with.
- **Pet type filter**: A new pet type filter has been added to the `/requests` page.
- Frontend (Pet Health): Vaccinations section with full owner-only CRUD, capability-gated, validation, and tests.
- Frontend (Pet Health): Default dates in forms — weight and medical note dates default to today; vaccination administered_at defaults to today and due_at defaults to one year from today.
- Pet Health (Phase 1): Weight tracking
- Env: Added `FRONTEND_URL` environment variable across local and Docker env files to represent the SPA base URL used in emails and redirects.
- **Password Reset System**: Complete password recovery functionality with professional email notifications.
- **Comprehensive SMTP Email System**: Complete SMTP infrastructure with multiple provider support and advanced email tracking.
- **Enhanced Login UI**: Complete redesign of authentication interface using shadcn/ui components.
- **Email Notifications System**: Comprehensive email notification system for placement requests and helper responses.
- Admin: User impersonation support in Filament.
- API Auth semantics (api/\*): Force JSON unauthenticated responses.
- Transfer responder visibility: New policy ability `viewResponderProfile` so owners/recipients/initiators can see the responder’s helper profile for a transfer request.
- **Transfer Handover Lifecycle:** Introduced a post-accept procedure to safely hand over the cat.
- **Ownership History:** New `ownership_history` table and model.
- **My Cats sections (`/api/my-cats/sections`):** `transferred_away` now derives from `ownership_history`.
- **Transfer Finalization:** Ownership changes for permanent transfers occur on handover completion.
- **Backfill Command:** `php artisan ownership-history:backfill` to create initial records.
- **Placement Response System**: Implemented the core functionality for helpers to respond to placement requests.
- **Helper Profile Feature**: Implemented full CRUD functionality for Helper Profiles.
- Added a "Helper Profiles" link to the user navigation menu.
- Added `start_date` and `end_date` to the `PlacementRequest` model and API.
- Added date picker components to the frontend.
- Implemented the initial Placement Request feature.
- Added a modal for creating placement requests.
- New scripts to automate frontend-backend asset integration.
- `NotificationBell.test.tsx`.
- `procps` and `net-tools` to Dockerfile for debugging.

### Changed

- Backend: `/api/version` is now driven by configuration via `config/version.php` and the `API_VERSION` env var.
- Admin: `PetTypeResource` now explicitly exposes "Weight tracking allowed" and "Microchips allowed" toggles in both the form and the table.
- Backend: `PetCapabilityService` handles dynamic capabilities for placement, weights, and microchips based on `PetType` flags.
- Backend: `PetType` model includes sensible defaults and casts for capability flags.
- Seeder: Cleaned and de-conflicted `PetTypeSeeder` to ensure Cat/Dog system types exist with expected capability flags.
- Docker: Optimized runtime image by avoiding global recursive `chown`; used `COPY --chown` and targeted `install -d` ownership only for Laravel-writable directories (`storage/**`, `bootstrap/cache`). This reduces build time and image layer churn.
- **Docs**: Updated `GEMINI.md` with a new "Linting and Formatting" section.
- **Backend**: Ran `pint` to fix PHP code style issues.
- **`cat` to `pet` rename**: The term `cat` has been renamed to `pet` throughout the codebase to reflect the new multi-pet support.
- Frontend (Pet Health): Human‑readable date display for health records (weights, medical notes, vaccinations) using locale formatting instead of raw ISO strings.
- Frontend: Restored Remove/status change flow in Pet Details with dialog (lost/deceased), password confirmation, and toasts; refreshes profile on success.
- Env/Config: Standardized URLs between backend and SPA.
- Backend Docker build: Upgraded Composer from 2.7 to 2.8.
- Docker startup: stabilized DB readiness by using a simple `pg_isready` host:port probe.
- Compose: simplified DB healthcheck.
- Frontend: Refined Cat Profile responses and handover UI.
- Frontend: Helper Profile dialog tightened types and display logic.
- **Redirect to login page after logout.**
- **Authorization Centralization:** `CatController@show` now relies on policies.
- **Admin Middleware:** Updated to support both enum-backed roles and string roles.
- **Docker Entrypoint/Env:** Entry point now generates `.env` as a fallback and creates `APP_KEY` when missing.
- **Auth Session Behavior:** Register/Login also establish a Sanctum session.
- **Login Redirect**: Improved the login redirect logic.
- **Transfer Acceptance Flow**: Accepting a transfer response now fulfills the related placement request transactionally.
- **Transfer Acceptance Flow (deferred finalization)**.
- **Cat Visibility Policy**: Active fosterers are allowed to view the cat profile.
- API exception handling: For `api/*`, exceptions render JSON by default.
- Proxy/IP handling: Nginx now forwards correct headers to PHP-FPM.
- TransferRequestPolicy: Broadened `accept`/`reject` to allow cat owner or `recipient_user_id`.
- Frontend: My Cats page UX polish.
- **Backup & Restore Scripts**: Improved to be more robust.
- **`.gitignore` & `.dockerignore`**: Updated to ignore unnecessary files.
- **Helper Profile**: User is now routed to the view page after update.
- Updated frontend dependencies.
- Upgraded npm to version 11.5.1.
- Refactored backend authentication to use session-based login/logout.
- Updated Sanctum config.
- Added session and cookie middleware to Laravel API routes.
- Removed Authorization header logic from frontend axios interceptor.
- Refactored frontend AuthContext to rely on session.
- Updated Dockerfile and docker-compose.yml for persistent uploads and cache clearing.
- Updated welcome.blade.php to use latest built asset.
- Updated composer dependencies and lockfile.
- Updated Nginx, Supervisor, and PHP-FPM configurations.
- Modified `build:docker` script in frontend `package.json`.
- Updated default avatar import method in frontend components.
- Added task to update Node.js version in roadmap.

### Fixed

- **Docker Startup Race Condition**: Fixed a critical race condition where the backend container would attempt to run migrations before the database was fully ready. The entrypoint script was updated to use a more robust `psql` check instead of `pg_isready`.
- Backend: Removed leftover merge conflict markers that caused a syntax error in `PetTypeResource.php` and related classes; reconciled implementations and restored a green test suite.
- Frontend: Resolved merge conflict markers across key pages, hooks, and API modules that blocked Vite builds; test suite green.
- **Helper profile deletion crash**: Fixed a crash that occurred when deleting a helper profile.
- **Non-editable inputs on helper profile edit page**: Fixed an issue where the inputs on the helper profile edit page were not editable.
- **Removed placement request availability message**: Removed the "Placement requests not available for..." message from the `PetCard` component.
- Frontend (Pet Profile): Resolved 403 on update by converting ISO dates to `YYYY-MM-DD` for HTML date inputs.
- Frontend: Removed duplicate Edit button from owner actions.
- Frontend: Repaired regressions in `WeightForm.tsx` and `PetProfilePage.tsx` introduced during earlier edits.
- **Password Reset Configuration**: Fixed password reset link generation to use correct frontend port.
- **Filament Admin Panel**: Fixed TypeError in Select component where null label values caused Internal Server Error.
- Frontend: CatCard "Fulfilled" badge incorrectly showed for new/open placement requests.
- **API/Policy**: Fixed 403 when viewing your own cat.
- Frontend Linting/Type Safety: Large cleanup pass across multiple files.
- Frontend Linting/Type Safety: Final sweep to zero ESLint errors.
- **API Routing:** Removed duplicate `/api/version` route declaration.
- **Test Stability**: Improved the reliability of tests in `EditCatPage.test.tsx`.
- **MyCatsPage Hooks Order**: Fixed a React hooks ordering error.
- **API**: Resolved 404 and empty array issues with `/api/cats/placement-requests` endpoint.
- **Database**: Resolved several database migration issues.
- **Backend Test Environment**: Resolved persistent database migration issues in the test environment.
- **Transfer Request Functionality**: Fixed `TransferRequestCreationTest` failures.
- **API Documentation**: Resolved OpenAPI documentation generation syntax errors.
- **Vite/Vitest CSS Handling**: Resolved a critical issue where Vitest tests were failing due to incorrect CSS parsing.
- Adjusted backend tests to reflect owner/admin-only access for cat profiles.
- **PlacementRequestModal Tests**: Temporarily disabled two tests due to timeouts.
- **Frontend Tests**: Re-enabled and fixed previously disabled tests.
- **Docker Environment**: Overhauled for robustness.
- **Authentication**: The entire authentication flow was fixed.
- **API Documentation**: The OpenAPI (Swagger) documentation was fixed.
- **File Permissions**: Corrected `storage` directory permissions.
- **Test Failures**: Fixed `sonner` library and test selector issues.
- **Frontend Tests**: Resolved multiple test failures with polyfills and logic fixes.
- API unauthenticated 500s: Eliminated `Route [login] not defined` errors.
- HelperProfile delete: Hardened deletion to clean up stored photos.
- Backend tests: Addressed flaky/failed tests.
- Resolved critical data loss issue with a Docker named volume.
- Corrected a build issue with the `PlacementRequest` type import.
- Fixed a UI bug with the select component background.
- Resolved 502 Bad Gateway error in Dockerized backend.
- Resolved missing default avatar image in frontend.
- Resolved "Undefined table" error by running migrations and seeders.
- Resolved 413, 422, and 500 errors related to file uploads.
- Fixed routing issue for direct URL access in the SPA.
- Corrected file permissions for user-uploaded images.

### Removed

- **Helper Profile**: Removed the `zip_code` field from the helper profile.
- Redundant frontend Axios client.
- "Back" button from the cat profile page.

### Docs

- OpenAPI: Regenerated API docs to sync with current endpoints, resolving the `ApiContractTest` mismatch.

### QA

- Frontend: Test suite passing.
- Backend: Test suite passing (including `ApiContractTest`).

### Breaking Change

- API now uses session/cookie authentication instead of token-based.

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
