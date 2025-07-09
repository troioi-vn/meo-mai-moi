# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented API endpoints for user reviews (`POST /api/reviews`, `GET /api/users/{id}/reviews`), now documented in Swagger.
- Implemented API endpoint for updating a cat's profile (`PUT /api/cats/{id}`), now documented in Swagger.
- Implemented API endpoint for adding medical records to a cat's profile (`POST /api/cats/{id}/medical-records`), now documented in Swagger.
- Implemented API endpoint for adding weight history to a cat's profile (`POST /api/cats/{id}/weight-history`), now documented in Swagger.
- Implemented API endpoints for managing cat custodianship transfer requests (`POST /api/cats/{cat_id}/transfer-request`, `POST /api/transfer-requests/{id}/accept`, `POST /api/transfer-requests/{id}/reject`), now documented in Swagger.
- Implemented API endpoint for retrieving authenticated user's helper profile status (`GET /api/helper-profiles/me`), now documented in Swagger.
- Implemented API endpoint for creating a new helper profile (`POST /api/helper-profiles`), now documented in Swagger.
- Implemented API endpoint for retrieving featured cat listings (`GET /api/cats/featured`), now documented in Swagger.
- Implemented API endpoint for retrieving a single cat's profile with dynamic viewer permissions (`GET /api/cats/{id}`), now documented in Swagger.
- Implemented API endpoint for retrieving all available cat listings (`GET /api/cats`), now documented in Swagger.
- Ran database migrations to create `users`, `cache`, `jobs`, and `cats` tables.
- Implemented API endpoint for creating new cat listings (`POST /api/cats`), now documented in Swagger.
- Implemented user profile management API endpoints (`GET /api/users/me`, `PUT /api/users/me`), now documented in Swagger.
- Added VitePress documentation setup and initial content.
- Set up a static site generator (`VitePress`) for the `docs/` directory.
- Installed and configured `l5-swagger` for the Laravel backend to handle OpenAPI documentation.
- Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend.
- Configured `PHP-CS-Fixer` for the Laravel backend to enforce PSR-12 coding standards.
- Initialized the React (Vite + TypeScript) project for the frontend SPA.
- Initialized the Laravel project for the backend API.
- Initial project setup.

### Changed

### Deprecated

### Removed

### Fixed

### Security
