# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Fixed

- **Emoji Initials in Chat and Avatars**: Fixed broken initials display when user names contain multi-character emojis (e.g., flags, family emojis) in chat list, chat windows, message bubbles, and user avatars. Implemented grapheme-aware initials generation using `Intl.Segmenter` with a fallback to `grapheme-splitter` library. Added comprehensive unit tests for emoji handling.

- **Database Seeders**: Updated `DatabaseSeeder` to create placement requests for all seeded pets (excluding birds), and implemented `PlacementRequestSeeder` as an idempotent seeder to backfill placement requests for existing cats and dogs in the database.

- **Database Seeders and Factories**: Updated factories and seeders to be compatible with recent database schema changes, including new fields like `city_id`, `is_read`, and `status`, and improved business logic for placement requests. Enhanced E2E testing seeder to include essential seeders for complete test data setup.

- **Docker Backend Setup**: Fixed missing Laravel `storage/framework/cache` directories in Docker container, preventing `file_put_contents` errors on Livewire requests by ensuring cache directories are created during both image build and container startup.

- **Impersonation UI**: Fixed avatar and main menu visibility during impersonation. Redesigned the impersonation banner to be more compact, showing "🕵 [user_name] x" instead of the longer text. Ensured the admin panel link remains visible to impersonating admins even when checking the impersonated user's permissions.

- **Messaging Hook Typing**: Refactored `useMessaging` hooks to use typed `Channel` objects instead of `any`, reducing technical debt and improving code reliability.
