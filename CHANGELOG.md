# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Notification Actions System**: Implemented actionable buttons on notifications, allowing users to perform actions directly from notification items (e.g., unapproving cities). Includes a handler registry system for extensible action definitions and confirmation dialogs for destructive actions.

- **City Creation Notifications**: Cities are now auto-approved upon creation, and notifications are sent to all admin users for review. Added rate limiting of 10 cities per user per 24 hours to prevent abuse.

- **Invitations page (tests)**: Added unit tests for the Invitations page to cover stats card rendering and behaviors (including revoked card visibility and numeric alignment).

### Changed

- **Backup and Deployment Scripts**: Enhanced `utils/backup.sh` with separate handling for database and uploads backups, improved error handling, and new command-line options. Updated `utils/deploy.sh` with restore options (`--restore`, `--restore-db`, `--restore-uploads`) and auto-backup functionality (`--auto-backup`). Deprecated `utils/restore.sh` in favor of the improved backup script.

- **Pet Profile Creation/Editing**: Made the City field optional when creating or editing pet profiles (`/pets/create` and `/pets/{id}/edit`).

- **Notification Model**: Improved synchronization logic for `read_at` and `is_read` fields to prefer `read_at` as the canonical source and handle updates more reliably.

- **City Creation Success Message**: Updated success toast from "City created (pending approval)" to "City created" since cities are now auto-approved.

- **Invitations page (UI)**: Made the invitations stats cards more compact and improved responsive layout; numeric counters are now left-aligned and use tabular numerals for better readability. The "Revoked" stats card is hidden when its value is zero to avoid showing empty/placeholder stats.

### Fixed

- **Impersonation UI**: Fixed avatar and main menu visibility during impersonation. Redesigned the impersonation banner to be more compact, showing "🕵 [user_name] x" instead of the longer text. Ensured the admin panel link remains visible to impersonating admins.
