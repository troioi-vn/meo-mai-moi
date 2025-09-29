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

### Fixed
- Resolved test failures after SQLite removal by installing `postgresql-client` and fixing test setup to use seeders.

### Removed
- SQLite database connection configuration and references
- `sqlite3` package from Docker image (no longer needed)
- SQLite database file creation from Composer post-install scripts
- SQLite references from documentation and development guides

