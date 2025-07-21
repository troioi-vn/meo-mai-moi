# GEMINI.md - Meo Mai Moi Project

This document outlines the conventions, goals, and workflow for the collaboration between the development team and the Gemini AI assistant on the Meo Mai Moi project.

## 1. Project Summary

**Meo Mai Moi** is an open-source web application engine designed to help communities build cat rehoming networks. It connects cat owners with fosters and adopters, supporting a community-driven approach to cat welfare. The platform is architected to be geographically modular, allowing anyone to deploy it for their own region.

## 2. Application Structure (User POV)

This outlines the high-level map of the application from the perspective of its users.

### Public-Facing Area (For all visitors)

-   **Homepage (`/`):** Main landing page with general info, featured cats, and calls to action.
-   **Available Cats (`/cats`):** A filterable gallery of all cats seeking a home.
-   **Cat Profile (`/cats/{id}`):** Detailed public page for a single cat.
-   **Available Helpers (`/helpers`):** A filterable list of approved users offering to foster or adopt.
-   **Helper Profile (`/helpers/{id}`):** Detailed public profile for a single helper.
-   **Apply to Help (`/apply-to-help`):** The questionnaire for users wanting to become helpers.
-   **Login & Registration Pages:** Standard account access pages.

### User Account Dashboard (For logged-in users)

-   **My Account (`/account`)::** A central dashboard for personal activities.
-   **My Cats:** Manage cats currently under the user's custodianship.
-   **My Helper Profile:** Create or edit their application to be a helper.
-   **Notifications:** View alerts and updates related to their activities.

### Admin Dashboard (For rescue staff only)

-   **Admin Home (`/admin`):** A private dashboard with operational overviews.
-   **Manage Cats:** Add new cats and view/edit all cats in the system. (Now uses enum status: `active`, `lost`, `deceased`, `deleted`)
-   **Manage Applications:** Review and approve/reject helper applications.
-   **Manage Users:** View all users and manage admin privileges.
-   **Manage Transfers:** View a complete history of all custodianship changes.

## 3. Tech Stack

- **Backend:** Laravel (PHP) - REST API with Filament Admin Panel
    - **ApiResponseTrait:** A custom trait used across controllers to standardize JSON responses for both success and error scenarios, ensuring consistent data wrapping (e.g., all successful responses are wrapped in a `data` key).
- **Frontend:** React (TypeScript) - Single Page Application
    -   **Tailwind CSS:** A utility-first CSS framework that provides low-level utility classes to build custom designs directly in your JSX. It promotes rapid UI development and highly customizable styling.
    -   **shadcn/ui:** Not a traditional component library, but a collection of re-usable components whose source code is added directly to your project. This provides full control and easy customization, as components are built with Tailwind CSS.
- **Database:** 
    - **Local Development:** SQLite (file-based, lightweight)
    - **Docker/Production:** PostgreSQL (robust, full-featured)
- **Admin Panel:** Filament v3 with FilamentShield for role-based permissions
- **Authentication:** Laravel Sanctum for API token authentication
- **Permissions:** Spatie Laravel Permission package
- **Deployment:** Docker Compose with optimized multi-stage builds

## 3.1. Technical Project Structure

**Key Configuration Files:**
- `components.json` - shadcn/ui configuration
- `vite.config.ts` - Frontend build configuration with path aliases
- `tsconfig.json` - TypeScript configuration with `@/*` path mapping
- `package.json` - Frontend dependencies and scripts

## 4. Development Roadmap

The development roadmap is maintained in the `roadmap.md` file in the root of the project. That file serves as the single source of truth for the project's development plan.

## 5. API Documentation & Integration

To ensure our API is well-documented and easily consumable, we will focus on the following:

-   **Task:** Add detailed Swagger (OpenAPI) annotations to all new and existing endpoints.
-   **Task:** Integrate Swagger UI with the frontend for easy access to API documentation.
-   **Task:** Implement an automated, test-driven process to ensure API changes are always reflected in the Swagger documentation. This will be achieved through **API Contract Testing**.


## 6. Internationalization (i18n)

To support multiple languages, we will implement the following:

-   **Backend (Laravel):** Use Laravel's built-in localization features. All user-facing strings will be stored in language files.
-   **Frontend (React):** Use `react-i18next` for managing translations.
-   **Supported Languages:** We will initially support English (`en`) and Vietnamese (`vn`).
-   **Admin Configuration:** The admin panel will include an interface for managing and adding new language strings.

## 7. Gemini's Role

As the AI assistant for this project, my primary responsibilities are:

- **Code Generation:** Write readable, tested, and idiomatic code following the project's established styles and patterns.
- **Architecture & Design (High Importance):** Be creative and proactive in suggesting architectural improvements, design patterns, and potential weak spots in the current implementation. These suggestions should be clearly marked.
- **Testing:** Assist in writing unit and integration tests, adhering to our TDD-for-features workflow.
- **Debugging:** Help identify and resolve bugs.
- **Clarification:** Ask questions to resolve ambiguity before implementing.

## 8. Development Practices

### Git Workflow

- **Branching:** All work should be done on separate branches.
- **Branch Naming Convention:**
    - New features: `feature/task-description` (e.g., `feature/add-user-profile-page`)
    - Bug fixes: `fix/bug-description` (e.g., `fix/login-form-validation`)

### Versioning

We will use **Semantic Versioning (SemVer)** managed via Git tags.
- **Format:** `MAJOR.MINOR.PATCH` (e.g., `v0.1.0`).
- **Pre-release:** All versions before our official public launch will have a `0` MAJOR version (e.g., `v0.1.0`, `v0.2.0`).
- **Tagging:** When a version is released (e.g., MVP), a new Git tag will be created. The `CHANGELOG.md` will be updated to reflect the version number and release date.

### Testing

- **TDD for New Features:** All new features must begin with a failing test that defines the desired functionality. This is the default approach for adding anything new.
- **Fixes & Refactoring:** The TDD rule is not strictly required for minor bug fixes or code improvements where it's impractical.
- **Default Frameworks:**
    - **Laravel (Backend):** Pest
    - **React (Frontend):** Vitest with React Testing Library (RTL)

### Backend Testing Strategy

We employ a layered testing approach using Pest:

*   **Unit Tests (`tests/Unit/`):** Isolate and test individual components (classes, methods) without external dependencies (database, file system, external APIs). Mock dependencies for true isolation.
*   **Feature Tests (`tests/Feature/`):** Test the full request-response cycle for API endpoints, interacting with the database (using `RefreshDatabase` trait) and internal services. External services are mocked. This is where our TDD-for-features workflow primarily applies.

**TDD Workflow:** For new features, write a failing feature test, implement the minimum code to pass, then refactor.

**Considerations:** High code coverage, explicit error handling tests, fast execution, and CI/CD integration.

### API Contract Testing & Pipeline Integration

To ensure our API implementation never deviates from its documentation, we will adopt a **contract testing** approach. This enhances our existing testing strategy by using the OpenAPI specification as the single source of truth.

**The Strategy:**
1.  **Contract First:** The Swagger annotations in the code are the definitive contract for the API's behavior.
2.  **Tests Validate the Contract:** Our Pest feature tests will be expanded to not only test application logic but also to validate that the API's responses (status codes, headers, JSON structure) perfectly match the schemas defined in the generated `openapi.json` file.
3.  **Preventing Drift:** This creates a powerful automated check. If a code change causes a response to differ from the documented contract, a test will fail, preventing the change from being merged until the contract (the annotation) is updated.

**CI/CD Pipeline Integration:**
This strategy is enforced via our CI/CD pipeline with the following steps on every pull request:
1.  **Lint Contract:** The pipeline will first lint the `openapi.json` file to check for syntax errors and ensure it follows best practices.
2.  **Run Tests:** The full Pest test suite, including the contract validation tests, is executed. A failure here indicates a mismatch between the code and the contract.
3.  **Verify Documentation Freshness:** The pipeline will run `artisan l5-swagger:generate` and then check if the command produced any changes to the `openapi.json` file. If it did, the build fails. This forces developers to always commit the most up-to-date version of the API documentation with their code changes.

This process guarantees that our API documentation is always a reliable and accurate reflection of its implementation.

#### Frontend Testing Strategy: A Practical Guide

The frontend test suite uses **Vitest** for running tests, **React Testing Library** for rendering and interacting with components, and **Mock Service Worker (MSW)** for mocking API requests. The new testing architecture is built on a foundation of consistency and realism, ensuring that components are tested in an environment that closely mirrors the actual application.

##### Key Principles

1.  **Always Use the Shared Test Utility**: All tests must use the `renderWithRouter` function from `frontend/src/test-utils.tsx`. This utility wraps components in all necessary providers (`QueryClientProvider`, `MemoryRouter`, `AuthProvider`, `Toaster`), ensuring a consistent and realistic test environment.
2.  **Use Centralized Mock Data**: All mock data, especially for primary models like `Cat`, should be defined in and imported from `frontend/src/mocks/data/`. This prevents data duplication and ensures that tests are consistent.
3.  **Rely on the Global Mock Server**: Individual test files must **not** set up their own MSW server. The global server is configured in `frontend/src/setupTests.ts` and uses a modular handler system.
4.  **Write User-Centric Tests**: Tests should focus on what the user sees and does. Assert against the rendered output (e.g., `screen.getByText('Fluffy')`) rather than component state or implementation details.
5.  **Avoid Global `axios` Mocks**: Do not use `vi.mock('axios', ...)` or similar global mocks for the API client in `setupTests.ts`. This can conflict with MSW's network-level interception and lead to hard-to-debug issues. Rely on MSW handlers to mock API responses.

##### Testing Architecture with TanStack Query and MSW

-   **TanStack Query Integration (`@tanstack/react-query`)**:
    -   **Problem**: Components that use hooks like `useQuery` or `useMutation` require a `QueryClientProvider` to be present in the component tree.
    -   **Solution**: A single `QueryClient` instance is provided to all test components via our custom `renderWithRouter` function. The query cache is cleared before each test to ensure test isolation.

-   **Modular MSW Handlers (`handlers.ts`)**:
    -   **Problem**: Mock handlers were previously scattered, inconsistent, and did not correctly handle URL resolution in the `jsdom` test environment, leading to network errors.
    -   **Solution**: The new architecture uses a centralized and modular approach:
        1.  **Absolute URLs**: All MSW handlers **must** use absolute URLs (e.g., `http://localhost:3000/api/cats`) to ensure they are correctly intercepted by the mock server.
        2.  **Data-Centric Modules**: Mock data and its corresponding handlers are grouped by resource (e.g., `frontend/src/mocks/data/cats.ts`).
        3.  **Central Handler Composition**: The main `frontend/src/mocks/handlers.ts` file imports and combines these modular handlers into a single `handlers` array for the global server.
        4.  **Correct API Structure**: All mock handlers are configured to return data in the same structure as the real API (e.g., wrapping responses in a `{ "data": ... }` object).


### Debugging and Problem Solving Strategy

When encountering issues, especially those related to environment or integration, we follow a systematic debugging process:

1.  **Understand the Symptom:** Clearly identify the error message, HTTP status code, and observed behavior (e.g., `502 Bad Gateway`, `CORS Missing Allow Origin`, `422 Unprocessable Content`).
2.  **Isolate the Problem:**
    *   **Check Logs:** Examine relevant logs (e.g., Docker container logs for `laravel.test`, Nginx logs, PHP-FPM logs) for specific error messages or clues.
    *   **Inspect Configuration:** Review configuration files related to the suspected component (e.g., `nginx.conf`, `php-fpm.conf`, Laravel's `cors.php`, `bootstrap/app.php`).
    *   **Verify Dependencies:** Ensure correct versions of PHP, Laravel, and other dependencies are installed and compatible.
    *   **Frontend/Backend Communication:** Use browser developer tools to inspect network requests and responses, verifying headers, payloads, and status codes.
3.  **Formulate a Hypothesis:** Based on observations, propose a likely cause for the problem.
4.  **Implement a Targeted Fix:** Make small, isolated changes to address the hypothesis.
5.  **Verify the Fix:**
    *   **Rebuild and Restart:** For Docker-related changes, always rebuild the affected image (`docker compose build <service_name>`) and force recreation of the container (`docker compose up -d --force-recreate`) to ensure changes are applied.
    *   **Clear Caches:** Clear relevant application caches (e.g., Laravel's `php artisan optimize:clear`, `config:clear`, etc.) to ensure old configurations are not interfering.
    *   **Retest:** Attempt the action that previously caused the error.
6.  **Iterate:** If the problem persists or a new one emerges, repeat the process from step 1.

### Coding Style & Linting

- **PHP / Laravel:**
    - **Standard:** PSR-12.
    - **Tool:** We will use `PHP-CS-Fixer` to automatically enforce the style guide.
- **TypeScript / React:**
    - **Style Guide:** Airbnb's JavaScript Style Guide.
    - **Formatter:** Prettier will be used to auto-format the code.

### React Components

- **Component Style:** We will use **Functional Components with Hooks** exclusively. Class-based components should not be used unless there is a specific, agreed-upon reason.
- **Performance Optimization:** Use `useCallback` and `useMemo` strategically to prevent unnecessary re-renders, especially in context providers and expensive computations.
- **Ref Forwarding:** Use proper `React.forwardRef` implementation for components that need to expose refs, ensuring React 19 compatibility.
- **Promise Handling:** Use explicit promise handling patterns:
  - Use `void` operator for fire-and-forget promises in event handlers
  - Use `.catch()` for error handling in promise chains
  - Avoid unhandled promise rejections

### Code Quality Standards

- **Zero ESLint Errors:** All code must pass ESLint checks without errors
- **Type Safety:** Comprehensive TypeScript usage with proper interface definitions
- **Error Handling:** Consistent patterns for handling `AxiosError` with proper type checking and fallback messages
- **Import Organization:** Use absolute imports with path aliases (`@/`) and consistent import order
- **Component Architecture:** Separate concerns by isolating context definitions, variant definitions, and component implementations

### Documentation

We treat documentation as an integral part of the project, maintained alongside the code.

-   **Location:** All project documentation is organized within the top-level `docs/` directory.
-   **Format:** Documentation files are written in Markdown.
-   **Maintenance:** Documentation will be version-controlled and updated with relevant code changes.
-   **Tooling:** We will use **VitePress** to render the Markdown files into a navigable website.

### Error Handling and User Feedback

To ensure a consistent and user-friendly experience, we will standardize error handling:

-   **API Error Format:** Define a consistent JSON structure for API error responses.
-   **Frontend Error Display:** Implement centralized mechanisms for displaying user-friendly error messages.
-   **Backend Error Logging:** Integrate centralized error logging on the backend.
-   **TypeScript Error Handling:** Use proper `AxiosError` type checking with comprehensive fallback patterns:
    ```typescript
    catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.'
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data.message ?? error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      // Handle error appropriately
    }
    ```
-   **Promise Handling:** Consistent async operation handling to prevent unhandled rejections and maintain user experience.

### CHANGELOG.md
- When a development task is completed, I must update the CHANGELOG.md file to document the change. I should add the completed task under the appropriate category (e.g., Added, Changed, Fixed) in the "[Unreleased]" section.

## 9. Command Glossary

### Local Development Setup
**Backend (Laravel + SQLite):**
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve  # http://localhost:8000
```

**Frontend (React + Vite):**
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Docker Setup
**Start Application:**
```bash
docker compose up -d --build
```

**Build with cache optimization:**
```bash
# Use BuildKit for better caching and parallel builds
DOCKER_BUILDKIT=1 docker compose build --parallel

# Or for just the backend service
DOCKER_BUILDKIT=1 docker compose build backend
```

**First-time Database Setup:**
```bash
# Automated setup (recommended)
docker compose --profile setup up migrate seed

# Or manual setup
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
docker compose exec backend php artisan shield:generate --all
```

**Manual Database Commands:**
```bash
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
docker compose exec backend php artisan shield:generate --all
```

**Admin Panel Access:**
- URL: http://localhost:8000/admin
- Default credentials: `test@example.com` / `password`

### Backend (Laravel)
- `php artisan serve`: Start the Laravel development server.
- `php artisan migrate`: Run database migrations.
- `php artisan test`: Run the Pest test suite.
- `php artisan l5-swagger:generate`: Regenerate the OpenAPI documentation.

### Frontend (React + Vite)
- `npm install`: Install Node.js dependencies.
- `npm run dev`: Start the local development server on `http://localhost:5173` with API proxying to Laravel.
- `npm run build`: Build the application for production and copy files to the Laravel backend for serving.
- `npm run build:docker`: Build the application for Docker deployment (no local file copying).
- `npm run test`: Run the Vitest test suite.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run format`: Run Prettier to format the code.

#### Frontend Architecture Notes
The frontend is built with React (using Vite) and TypeScript. It uses `vite-tsconfig-paths` to enable path aliases (e.g., `@/*`) defined in `tsconfig.json`. This allows for cleaner, more maintainable import statements across the application. All new components and pages should use these aliases for imports.

**Path Alias Configuration:**
-   **`vite.config.ts`:** Configured with the `tsconfigPaths()` plugin.
-   **`tsconfig.json`:** Contains the base URL and path mappings. The primary alias is `@/*`, which maps to `src/*`.
-   **`components.json`:** Configured to use the `@/` alias for `shadcn/ui` components.

#### Frontend UI/UX Libraries & Patterns

**Notification System:**
- **Library:** `sonner` (not a custom useToast hook)
- **Usage:** `import { toast } from 'sonner'`
- **API:** Simple toast functions: `toast.success()`, `toast.error()`, `toast.info()`
- **Integration:** The `<Toaster />` component from `@/components/ui/sonner` is included in the main App component

**API Client:**
- **Location:** `@/api/axios` (exports `api` instance)
- **Not:** `@/lib/api` (this doesn't exist)
- **Features:** Pre-configured with interceptors for authentication and base URL handling
- **Usage:** `import { api } from '@/api/axios'` for all HTTP requests

**Component Architecture:**
- **Base Components:** Located in `@/components/ui/` (shadcn/ui components)
- **Business Components:** Located in `@/components/` with clear feature organization
- **Testing:** Components should include comprehensive test files using Vitest + RTL
- **State Management:** React Context for global state (auth), local state with hooks for component-specific state

**Form Handling:**
- **Validation:** Uses error handling patterns with `AxiosError` type checking
- **Error Display:** Consistent error message patterns using toast notifications
- **API Integration:** Standardized error handling with fallback messages for network issues

**Permission-Based UI:**
- **Pattern:** Components receive `isOwner` or similar permission props to conditionally render UI elements
- **Implementation:** UI elements are shown/hidden based on user permissions rather than role names
- **Security:** Frontend permissions are for UX only - backend enforces actual security


## 10. Core Data Models

Based on user feedback, we are architecting a **Rescue Management System**. The core concept is tracking **Cat Custodianship** over time, providing a full, auditable history for each animal.

**User Roles & Permissions:** The system uses an explicit Role-Based Access Control (RBAC) model to ensure security and clarity. Each user has a single, well-defined role that dictates their permissions.

```php
enum UserRole: string {
    case ADMIN = 'admin';
    case CAT_OWNER = 'cat_owner';
    case HELPER = 'helper';
    case VIEWER = 'viewer';
}

enum Permission: string {
    case CREATE_CAT = 'create_cat';
    case EDIT_OWN_CAT = 'edit_own_cat';
    case DELETE_OWN_CAT = 'delete_own_cat';
    case VIEW_CONTACT_INFO = 'view_contact_info';
    case APPROVE_HELPERS = 'approve_helpers';
    case MANAGE_ALL_CATS = 'manage_all_cats';
}
```

**Role-Permission Matrix:**

*   **ADMIN**: Has all permissions, including `MANAGE_ALL_CATS` and `APPROVE_HELPERS`.
*   **CAT_OWNER**: Can `CREATE_CAT`, `EDIT_OWN_CAT`, and `DELETE_OWN_CAT`.
*   **HELPER**: Can `VIEW_CONTACT_INFO` of cat owners after their helper application is approved.
*   **VIEWER**: Can browse public cat profiles. This is the default role for any registered user.

**Implementation Notes:**

*   Permissions will be checked using dedicated middleware for API routes.
*   There will be clear processes for role upgrades (e.g., a `VIEWER` becomes a `HELPER` after their helper application is approved).

**Cat Status:**
  - The `Cat` model now uses a status enum: `active`, `lost`, `deceased`, `deleted`.
  - All business logic, API, and UI are updated to use these values.

---

## 11. Authentication

To ensure secure user access, we will implement the following authentication features:

-   **Standard Login/Registration:**
    -   Users will register and log in using an email address and password.
    -   **Password Reset/Forgot Password:** Backend endpoints and frontend forms for users to securely reset their passwords via email.
    -   **Email Verification:** New user registrations will require email verification to ensure valid email addresses and enhance security.
    -   **Rate Limiting:** Implement rate limiting on authentication endpoints to prevent brute-force attacks.

### Frontend: React Context & Axios Interceptors

The frontend uses React Context to manage authentication state globally. An `AuthProvider` component wraps the application, providing user data and auth functions (`login`, `logout`, etc.) to any component through a `useAuth` hook. API requests are handled by Axios, which uses an interceptor to automatically attach the user's authentication token to every outgoing request.

**Architecture Details:**
- **Context Separation:** The context definition is separated into `auth-context.tsx` for better maintainability
- **Performance Optimization:** All context functions use `useCallback` to prevent unnecessary re-renders
- **Type Safety:** Comprehensive TypeScript interfaces ensure type safety across auth operations
- **Error Handling:** Consistent error handling patterns with proper `AxiosError` type checking

## 12. Production Deployment and Operations

To ensure a smooth and reliable deployment process, we will consider the following:

-   **Environment Variable Management:** Securely manage environment variables in production (e.g., using Docker secrets or cloud provider secrets management).
-   **Database Migrations:** Outline a strategy for running database migrations in a production environment (e.g., as part of a deployment script).
-   **CI/CD Pipeline:** Consider implementing a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing and deployment, reducing manual errors and speeding up releases.

### Build Strategy & Docker Integration

The project uses a multi-stage Docker build that ensures consistent frontend builds across environments:

**Docker Build Process:**
1. **Frontend Stage**: Runs `npm run build:docker` to build the React application to `dist/`
2. **Backend Stage**: Copies the built frontend from `dist/` to `./public/build/` in the Laravel container
3. **Final Container**: Serves the frontend through Laravel/Nginx on port 8000

**Local Development vs Production:**
- **Local**: `npm run build` builds and copies files to `../backend/public/build/` for immediate Laravel serving
- **Docker**: `npm run build:docker` builds to `dist/` only, Docker handles the copying during container build
- **Development**: `npm run dev` serves on port 5173 with hot-reloading and API proxying

This approach ensures:
- ✅ No build process changes needed for existing Docker deployment
- ✅ Local development properly updates Laravel-served version
- ✅ Production containers remain optimized and consistent

### File Upload Strategy

All user-uploaded files will be stored on the local filesystem of the VPS, organized into a structured directory within `/public/uploads/`.

**Directory Structure:**

```
/public/uploads/
├── cats/
│   ├── profiles/     // Cat profile images
│   └── medical/      // Medical documents
├── users/
│   └── avatars/      // User profile images
└── temp/             // Temporary uploads (cleaned daily)
```

**Implementation:**

A dedicated `FileUploadService` will handle all file operations, including validation, storage, and database record creation.

```php
class FileUploadService {
    public function uploadCatPhoto(UploadedFile $file, Cat $cat): string {
        $filename = $cat->id . '_' . time() . '.' . $file->extension();
        $path = $file->storeAs('cats/profiles', $filename, 'public');
        
        // Assuming a 'photos' relationship exists on the Cat model
        $cat->photos()->create([
            'filename' => $filename,
            'path' => $path,
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);
        
        return $path;
    }
}
```

**Key Features:**

-   **Image Optimization:** All uploaded images intended for display (avatars, cat profiles) will be automatically resized and optimized to reduce file size and improve loading times.
-   **File Cleanup:** A system will be in place to delete associated files when a parent record (like a `Cat` or `User`) is deleted.
-   **Temporary File Management:** A scheduled task will run daily to clean out old files from the `/temp/` directory.

## 13. User Preferences

- **Collaboration Style:** Iterative, feedback-driven.
- **Command Style:** Imperative (e.g., "Refactor this function", "Write a test for the login API").
- **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.

---
## 14. Success Metrics & Tracking

To ensure the project is achieving its real-world goals, we will define and track key success metrics. This will be implemented via a centralized `MetricService`.

```php
enum MetricType: string {
    case SUCCESSFUL_ADOPTION = 'successful_adoption';
    case USER_REGISTRATION = 'user_registration';
    case CAT_LISTING_CREATED = 'cat_listing_created';
    case HELPER_APPLICATION = 'helper_application';
    case CONTACT_INITIATED = 'contact_initiated';
    case TIME_TO_ADOPTION = 'time_to_adoption';
}

class MetricService {
    public function recordAdoption(Cat $cat, User $adopter): void {
        Metric::create([
            'metric_name' => MetricType::SUCCESSFUL_ADOPTION,
            'metric_value' => 1,
            'recorded_at' => now(),
            'metadata' => [
                'cat_id' => $cat->id,
                'adopter_id' => $adopter->id,
                'days_listed' => $cat->created_at->diffInDays(now()),
            ],
        ]);
    }
}
```

### Initial Success Goals

-   **Adoption Rate:** 70% of listed cats to be successfully adopted within 30 days of listing.
-   **User Retention:** 80% of users who initiate contact with another user remain active on the platform.
-   **Ease of Use:** A user should be able to initiate contact with a cat owner or helper in fewer than 5 clicks from the homepage.

---
## 15. Self-Service Operations & Community Moderation

To minimize administrative bottlenecks and empower users, the platform will operate on a self-service model. Core operations like becoming a helper or listing a cat will be automated, with admins stepping in only to handle exceptions and community-reported issues.

### Auto-Approval and Verification

Instead of manual admin review, a `HelperVerificationService` will automatically approve users who meet basic criteria.

```php
class HelperVerificationService {
    public function autoVerifyHelper(HelperProfile $helper): bool {
        $checks = [
            $this->hasValidEmail($helper->user),
            $this->hasCompletedProfile($helper),
            $this->passesBasicScreening($helper), // e.g., no flagged keywords
        ];
        
        return !in_array(false, $checks);
    }
}
```

### Community-Based Reporting

A robust `ReportService` will be the primary mechanism for ensuring safety and trust. Users can report other users or cat listings for review by the admin team.

```php
class ReportService {
    public function reportUser(User $reported, User $reporter, string $reason): void {
        Report::create([
            'reported_user_id' => $reported->id,
            'reporter_user_id' => $reporter->id,
            'reason' => $reason,
            'status' => 'pending_review',
        ]);
    }
}
```

This approach means:
-   Helpers can self-register and be approved automatically.
-   Cat owners can manage their own listings directly.
- Admins focus on moderation and dispute resolution, not routine approvals.

---
## 16. Mobile Strategy

To ensure the platform is accessible to the widest possible audience, we will adopt a **mobile-first responsive design** strategy for the React frontend. All components and layouts will be designed for mobile screens first, then enhanced for larger desktop views.

### Key Pillars:

1.  **Responsive CSS Framework:** We will integrate a utility-first CSS framework like **Tailwind CSS** and a component library like **shadcn/ui** to accelerate the development of a responsive UI and ensure consistency across all devices.
    **Implementation Plan for Tailwind CSS & shadcn/ui:**
    -   **Install Tailwind CSS:** Add Tailwind CSS to the React frontend project.
    -   **Configure Tailwind CSS:** Set up `tailwind.config.js` and import Tailwind's base styles.
    -   **Install shadcn/ui CLI:** Use the shadcn/ui CLI to initialize and add components. (Note: `shadcn-ui` is deprecated, use `npx shadcn@latest add <component>` instead).
    -   **Add Components:** Start adding necessary UI components (e.g., Button, Input, Card) using the shadcn CLI.
2.  **Progressive Web App (PWA):** The application will be built as a PWA. This will provide users with an app-like experience, including the ability to add the site to their home screen and access certain features offline, without the need for separate native app development for iOS and Android.
3.  **Performance:** Mobile performance will be a key consideration. We will prioritize optimized images, lazy loading, and efficient data fetching to ensure a fast and smooth experience, even on slower mobile networks.

### Long-Term Vision: Native Mobile App

While the immediate focus is on a high-quality, responsive PWA, a native mobile app for iOS and Android remains a long-term goal. A native app could be considered in a future phase to provide an even more integrated experience, including features like push notifications and deeper OS integration, further broadening the platform's reach and engagement.

---
## 17. Community Feedback & Iteration

To ensure the platform evolves in alignment with real-world user needs, we will establish a formal feedback loop. This process makes our users active collaborators in the development cycle.

### Feedback Channels

1.  **In-App Feedback Form:** A simple, non-intrusive feedback form will be accessible from the user dashboard, allowing users to submit suggestions or report non-critical issues at any time.
2.  **Beta Testing Program:** We will create an opt-in beta testing program for engaged community members to test new features before they are released to the public. This provides a structured environment for gathering detailed feedback on major updates.
3.  **User Surveys:** Periodic surveys will be sent out to gather structured data on user satisfaction, feature requests, and overall priorities.

### Closing the Loop

Gathering feedback is only the first step. We will implement a process to:
-   Regularly review all feedback submissions.
-   Triage submissions into categories (bug, feature request, suggestion).
-   Convert actionable items into development tickets.
-   Communicate back to the community about which suggestions are being implemented to show that their input is valued.



## 18. UI/UX Design Principles & Beautification Plan

**Status:** Completed. The frontend has been beautified according to the principles outlined below, leveraging Tailwind CSS and shadcn/ui.

  To enhance the visual appeal and user experience of the Meo Mai Moi application, we will focus on the following principles and actionable steps, leveraging
  our existing Tailwind CSS and shadcn/ui tools:


   1. Consistent Design System:
       * Color Palette: Define and consistently apply a project-specific color palette (primary, accent, neutral, success, error colors) using Tailwind's
         configuration.
       * Typography: Establish a clear typographic scale (font sizes, weights, line heights) for all text elements.
       * Spacing: Utilize a consistent spacing scale (e.g., p-4, m-2) to create visual rhythm and hierarchy.
       * Shadows & Borders: Apply subtle shadows and borders to elements like cards and buttons for depth and separation.


   2. Strategic shadcn/ui Component Implementation:
       * Component Exploration: Actively explore and integrate relevant shadcn/ui components (buttons, inputs, cards, dialogs, navigation, etc.) to replace
         custom or basic HTML elements.
       * Customization: Leverage shadcn/ui's code-based approach to customize components to align with the defined color palette, typography, and overall
         design system.


   3. Optimized Layout and Visual Hierarchy:
       * Responsive Layouts: Employ Tailwind's flexbox and grid utilities to create clean, responsive layouts that adapt seamlessly across various screen sizes
         (mobile, tablet, desktop).
       * Whitespace Management: Utilize ample whitespace to reduce visual clutter, improve readability, and highlight key information.
       * Visual Grouping: Group related UI elements visually using cards, distinct background colors, or borders to enhance user comprehension and navigation.


   4. Performance and Accessibility:
       * Performance: Prioritize efficient rendering and loading times, especially for mobile users.
       * Accessibility: Ensure all UI elements are accessible, adhering to WCAG guidelines where applicable (e.g., sufficient color contrast, proper ARIA
         attributes).