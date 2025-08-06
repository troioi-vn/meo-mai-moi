# GEMINI.md - Meo Mai Moi Project

This document outlines the high-level strategy, architecture, conventions, and goals for the Meo Mai Moi project.

## 1. Project Summary

**Meo Mai Moi** is an open-source web application designed to help communities build cat rehoming networks. It connects cat owners with fosters and adopters, supporting a community-driven approach to cat welfare.

## 2. Application Structure (User POV)

-   **Public Area:** Homepage, Available Cats, Cat Profiles, Available Helpers, Helper Profiles, Login/Registration.
-   **User Dashboard:** Account management, manage personal cat listings, manage helper profile, notifications.
-   **Admin Dashboard:** Manage all cats, users, applications, and transfers.

## 3. Tech Stack & Core Architecture

-   **Backend:** Laravel (PHP) REST API with a Filament Admin Panel.
-   **Frontend:** React (TypeScript) SPA with Vite, Tailwind CSS, and shadcn/ui.
-   **Database:** SQLite (local), PostgreSQL (production).
-   **Deployment:** Docker Compose with an optimized multi-stage build.

### Core Architectural Principles

-   **API First:** The API is documented using OpenAPI (Swagger) annotations. We use **API Contract Testing** to ensure the documentation and implementation never drift apart.
-   **Self-Service & Moderation:** The platform empowers users to manage their own content. Admins focus on handling exceptions and community-reported issues.
-   **Mobile First:** The frontend is built with a responsive, mobile-first design strategy.

### Core Data Models

-   **User Roles:** `ADMIN`, `CAT_OWNER`, `HELPER`, `VIEWER`.
-   **Permissions:** A granular system (`CREATE_CAT`, `VIEW_CONTACT_INFO`, etc.) is managed by Spatie Laravel Permission.
-   **Cat Status:** The `Cat` model uses a status enum: `active`, `lost`, `deceased`, `deleted`.

### Authentication

The frontend uses React Context (`AuthProvider`) to manage session-based authentication state. An Axios interceptor automatically handles session cookies for all API requests.

### File Uploads

Uploaded files are stored on the local filesystem in `storage/app/public` and made accessible via the `public/storage` symlink, which is created by the `php artisan storage:link` command. The `FileUploadService` handles all file operations, including image optimization.

## 4. Atypical Project Aspects & Key Workflows

This project has several specific, non-standard workflows that are critical to understand.

-   **Tightly Coupled Frontend/Backend Build:**
    -   The frontend and backend build processes are linked. Running `npm run build` in the `frontend` directory not only builds the assets but also directly modifies the backend's `welcome.blade.php` file.
    -   The Docker build is a multi-stage process that builds the frontend first, then copies the compiled assets into the final backend image. This is crucial for understanding deployment.

-   **Strict API Contract Testing:**
    -   Our CI/CD pipeline enforces that the API implementation never deviates from its OpenAPI documentation.
    -   If you change an API endpoint, you **must** update its `@OA` annotation, run `php artisan l5-swagger:generate`, and commit the updated `openapi.json` file. Builds will fail otherwise.

-   **Runtime Container Setup:**
    -   The `backend/docker-entrypoint.sh` script performs critical setup tasks every time the container starts, most importantly running `php artisan storage:link` as the `www-data` user. If file uploads are not working, this script is the first place to check.

## 5. Development Practices

### Versioning & Changelog

We use **Semantic Versioning** (e.g., `0.4.0`). All changes are tracked in `CHANGELOG.md`.

**Changelog Workflow:**
1.  **Finish your task** (e.g., fix a bug, add a feature).
2.  **Open `CHANGELOG.md`** and find the right category under `[Unreleased]` (`Added`, `Changed`, `Fixed`).
3.  **Add a short, clear line** describing the change from a user's perspective (e.g., "- Added a 'Stay Logged In' checkbox to the login page.").

### Git Workflow

-   **Branches:** All work is done on separate branches.
-   **Naming:** `feature/task-description` or `fix/bug-description`.

### Testing Strategy

-   **Backend (Pest):** We use a layered approach with **Unit tests** for isolated components and **Feature tests** for full API request-response cycles.
-   **Frontend (Vitest + RTL):** We test components in a realistic environment using a shared `renderWithRouter` utility and centralized mock data.

#### Frontend API Mocking (MSW)

For API mocking, we use **Mock Service Worker (MSW)**. It intercepts network requests and returns mocked data.

**Key Principles:**
1.  **Use the Global Server:** The global server is configured in `frontend/src/setupTests.ts`.
2.  **Use Centralized Handlers:** Mock handlers are organized by resource (e.g., `frontend/src/mocks/data/cats.ts`).
3.  **Use Absolute URLs:** Handlers must use absolute URLs (e.g., `http://localhost:3000/api/cats`).
4.  **Match API Structure:** Mock responses must match the real API structure, including the `{ "data": ... }` wrapper.

### Debugging Strategy

When encountering an issue, follow this process:
1.  **Understand the Symptom:** Identify the error message, status code, and behavior.
2.  **Isolate the Problem:** Check logs (`docker compose logs -f backend`), inspect configurations (`nginx.conf`, `php.ini`), and use browser dev tools.
3.  **Formulate a Hypothesis:** Propose a likely cause.
4.  **Implement a Targeted Fix:** Make a small, isolated change.
5.  **Verify the Fix:** Rebuild and restart containers (`docker compose up -d --build --force-recreate`), clear caches (`php artisan optimize:clear`), and re-test.

### Common Debugging Scenarios & Solutions

This section documents common issues encountered during development and their effective solutions.

-   **Backend Test Environment - Database Schema Mismatches:**
    -   **Symptom:** Tests fail with "no such column" or similar schema-related errors, even when `RefreshDatabase` trait is used.
    -   **Cause:** Often due to conflicting migration files (e.g., a consolidated migration trying to recreate existing tables) or new columns not being present in the *initial* table creation migration. The `RefreshDatabase` trait might not always re-run *all* migrations if it perceives the schema as already migrated based on the `migrations` table.
    -   **Solution:**
        1.  **Identify and Remove Conflicting Migrations:** If a migration attempts to create tables that already exist (e.g., a consolidated `create_initial_tables` migration), remove it.
        2.  **Ensure New Columns are in Initial Migration:** For new columns, add them directly to the *initial* migration that creates the table, rather than a separate `add_column_to_table` migration. This ensures the column is always present when the table is first created in a fresh test environment.
        3.  **Verify `phpunit.xml`:** Ensure `DB_CONNECTION` is `sqlite` and `DB_DATABASE` is `:memory:` for a clean, in-memory database for each test run.
        4.  **Clear Caches:** Always run `php artisan optimize:clear` to ensure Laravel's configuration and route caches are fresh.

-   **`403 Forbidden` Errors in Backend Tests (Authorization Issues):**
    -   **Symptom:** API requests in feature tests return `403 Forbidden` even when the user appears to have the correct role/permissions.
    -   **Causes:**
        1.  **Incorrect User Role/Authentication:** The test user's role might not be correctly set, or the authentication method (`Sanctum::actingAs()`, `$this->be()`) might not be fully simulating the production environment.
        2.  **Missing/Incorrect Policy Definition:** The relevant policy might not be registered in `AuthServiceProvider.php`, or its authorization logic (`create`, `view`, `update`, `accept`, `reject` methods) might be flawed.
        3.  **Incorrect Data State:** The model's attributes (e.g., `cat->status`, `transferRequest->status`) might not be in the expected state for the authorization check to pass.
        4.  **Missing Relationships:** Required relationships (e.g., `placementRequest` on `TransferRequest`) might not be eager loaded in the test, causing `null` objects and subsequent authorization failures.
        5.  **Mass Assignment Issues:** Missing attributes in the model's `$fillable` array can prevent data from being saved, leading to unexpected states.
    -   **Solution:**
        1.  **Systematic Debugging with `dd()`:** Use `dd($response->json())` to inspect the full API response, including error messages. Use `dd($user->role)`, `dd($cat->status)`, `dd($transferRequest->status)`, and `dd($transferRequest->placementRequest)` at critical points in the controller and policy methods to inspect object states and pinpoint where the authorization check fails.
        2.  **Verify User Roles and Data in Test Factories:** Ensure test factories create users with the correct roles and models with the necessary attributes and relationships in the expected states (e.g., `CatStatus::ACTIVE`, `PlacementRequestStatus::OPEN`, `TransferRequestStatus::PENDING`).
        3.  **Eager Load Relationships:** If a policy or controller relies on a relationship, ensure it's eager loaded in the test (e.g., `->load('placementRequest')`) to prevent `null` object issues.
        4.  **Check `$fillable` Arrays:** Confirm all mass-assignable attributes are included in the model's `$fillable` array.
        5.  **Clear Caches:** Always run `php artisan optimize:clear` after making changes to policies or controllers.

-   **OpenAPI Documentation Generation Failures:**
    -   **Symptom:** `php artisan l5-swagger:generate` command fails with syntax errors (e.g., "unexpected '}', expecting EOF").
    -   **Cause:** Syntax errors within `@OA` annotations in PHP files. These are often subtle, like a missing comma, bracket, or parenthesis.
    -   **Solution:** The error message usually provides a file path and line number. Carefully inspect the annotations around that line for any syntax mistakes.

### Coding Style

-   **PHP/Laravel:** PSR-12, enforced by `PHP-CS-Fixer`.
-   **TypeScript/React:** Airbnb style guide, enforced by Prettier and ESLint.

### Key Frontend Patterns

-   **Notification System:** `sonner` (`import { toast } from 'sonner'`).
-   **API Client:** `@/api/axios.ts` (`import { api } from '@/api/axios'`).
-   **Component Style:** Functional Components with Hooks.
-   **Permissions:** UI is controlled by permission props (e.g., `isOwner`).

## 6. Command Glossary

-   **Start Application (Docker):** `docker compose up -d --build`
-   **Run Backend Tests:** `docker compose exec backend php artisan test`
-   **Run Frontend Tests:** `cd frontend && npm run test`
-   **Run Migrations/Seeders (Docker):** `docker compose exec backend php artisan migrate --seed`
-   **Generate API Docs:** `docker compose exec backend php artisan l5-swagger:generate`
-   **Admin Panel:** `http://localhost:8000/admin` (Credentials: `test@example.com` / `password`)

## 7. User Preferences

-   **Collaboration Style:** Iterative, feedback-driven.
-   **Command Style:** Imperative (e.g., "Refactor this function").
-   **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.
-   **Development Command Execution:** For development, use `php artisan ...` locally in the `backend/` directory, not via Docker.