# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Breaking:** Removed SQLite support entirely - PostgreSQL is now the only supported database
- Default database connection changed from SQLite to PostgreSQL in all environments
- Tests now run against PostgreSQL instead of SQLite in-memory database
- Queue and batching configuration updated to use PostgreSQL instead of SQLite fallbacks
- Pet API: Deprecated strict required exact `birthday`; now optional and superseded by precision + component fields. Supplying legacy `birthday` alone auto-coerces precision=day.

### Added

- PgAdmin interface for local database management
- Enhanced documentation for PostgreSQL-only development workflow
- Comprehensive frontend code quality improvements with 140+ ESLint fixes
- Support for approximate / unknown pet birthdays via `birthday_precision` enum (`day|month|year|unknown`) and component fields `birthday_year`, `birthday_month`, `birthday_day`; frontend form precision selector & age display helper.

### Fixed
- Resolved test failures after SQLite removal by installing `postgresql-client` and fixing test setup to use seeders
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

### Removed
- SQLite database connection configuration and references
- `sqlite3` package from Docker image (no longer needed)
- SQLite database file creation from Composer post-install scripts
- SQLite references from documentation and development guides

### Unreleased (delta)
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

