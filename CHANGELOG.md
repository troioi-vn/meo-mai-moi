# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Breaking:** Removed SQLite support entirely - PostgreSQL is now the only supported database
- Default database connection changed from SQLite to PostgreSQL in all environments
- Tests now run against PostgreSQL instead of SQLite in-memory database
- Queue and batching configuration updated to use PostgreSQL instead of SQLite fallbacks

### Added
- Dedicated PostgreSQL development container setup in `utils/dev-pgsql-docker/`
- PgAdmin interface for local database management
- Enhanced documentation for PostgreSQL-only development workflow
- Comprehensive frontend code quality improvements with 140+ ESLint fixes

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

