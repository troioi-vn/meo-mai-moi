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
- Dedicated PostgreSQL development container setup in `utils/dev-pgsql-docker/`
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

### Removed
- SQLite database connection configuration and references
- `sqlite3` package from Docker image (no longer needed)
- SQLite database file creation from Composer post-install scripts
- SQLite references from documentation and development guides

### Unreleased (delta)
- Frontend: Added a prominent "Lost" status badge to `PetCard` and corresponding unit test to ensure the badge renders when `pet.status === 'lost'`.
- Frontend tests: Fixed typing for test helpers (added `MockUser` type) so tests accept a mock user object; all `PetCard` tests pass.
- Password flow: Moved password change UI to a dedicated `/account/password` page (`PasswordPage`), updated `ChangePasswordForm` to force logout and redirect to `/login` after a successful password change, and updated tests to assert logout/redirect behavior and adjusted copy.
- Profile page: Replaced inline password form with a link to the new password page and small UI polish for the password card.
- Create/Edit Pet page: Added edit-mode improvements: navigation back button, photo preview for current pet photo in edit mode, and redirect to the pet profile after status updates.
- Frontend package: changed test script to run `vitest run` (removed `--silent` flag) to surface test output during runs.
- Documentation: Removed several backend docs files (notification-related docs, OpenAPI dump, unsubscribe, send-email job, and other legacy docs) as part of documentation cleanup.
- Repo config: Tweaked `.gitignore` and updated `backend/.env.docker` handling (dev docker env changes).

