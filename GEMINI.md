#  GEMINI.md - Meo Mai Moi Project

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
-   **Manage Cats:** Add new cats and view/edit all cats in the system.
-   **Manage Applications:** Review and approve/reject helper applications.
-   **Manage Users:** View all users and manage admin privileges.
-   **Manage Transfers:** View a complete history of all custodianship changes.

## 3. Tech Stack

- **Backend:** Laravel (PHP) - REST API
- **Frontend:** React (TypeScript) - Single Page Application
    -   **Tailwind CSS:** A utility-first CSS framework that provides low-level utility classes to build custom designs directly in your JSX. It promotes rapid UI development and highly customizable styling.
    -   **shadcn/ui:** Not a traditional component library, but a collection of re-usable components whose source code is added directly to your project. This provides full control and easy customization, as components are built with Tailwind CSS.
- **Database:** PostgreSQL
- **Deployment:** Docker Compose (Images will be stored on the same VPS as the application, not in cloud storage initially).

## API Documentation & Integration

To ensure our API is well-documented and easily consumable, we will focus on the following:

-   **Task:** Add detailed Swagger (OpenAPI) annotations to all new and existing endpoints.
-   **Task:** Integrate Swagger UI with the frontend for easy access to API documentation.
-   **Task:** Implement an automated, test-driven process to ensure API changes are always reflected in the Swagger documentation. This will be achieved through **API Contract Testing**.


## 4. Internationalization (i18n)

To support multiple languages, we will implement the following:

-   **Backend (Laravel):** Use Laravel's built-in localization features. All user-facing strings will be stored in language files.
-   **Frontend (React):** Use `react-i18next` for managing translations.
-   **Supported Languages:** We will initially support English (`en`) and Vietnamese (`vn`).
-   **Admin Configuration:** The admin panel will include an interface for managing and adding new language strings.

## 5. Gemini's Role

As the AI assistant for this project, my primary responsibilities are:

- **Code Generation:** Write readable, tested, and idiomatic code following the project's established styles and patterns.
- **Architecture & Design (High Importance):** Be creative and proactive in suggesting architectural improvements, design patterns, and potential weak spots in the current implementation. These suggestions should be clearly marked.
- **Testing:** Assist in writing unit and integration tests, adhering to our TDD-for-features workflow.
- **Debugging:** Help identify and resolve bugs.
- **Clarification:** Ask questions to resolve ambiguity before implementing.

## 6. Development Practices

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

#### Frontend Testing Strategies

For the React frontend, we employ a combination of unit and integration tests using Vitest and React Testing Library (RTL). Our focus is on testing user-facing behavior rather than internal component implementation details.

-   **Unit Tests:** For isolated functions and small, stateless components.
-   **Integration Tests:** For components that interact with other components, APIs, or the DOM. These tests simulate user interactions to ensure the application behaves as expected from a user's perspective.

**Key Principles:**
-   **User-Centric:** Tests should reflect how users interact with the application.
-   **Accessibility:** RTL encourages testing with accessibility in mind by querying elements the way a user would (e.g., `getByRole`, `getByLabelText`).
-   **Mocking:** External dependencies (like API calls) are mocked to ensure tests are fast, reliable, and isolated.

**Running Frontend Tests:**
-   To run all tests: `npm run test`
-   To run tests in watch mode: `npm run test -- --watch`
-   To run a specific test file: `npm run test -- <path-to-test-file>`

**Code Quality Checks:**
-   **Linting:** `npm run lint` (ESLint with Airbnb config)
-   **Formatting:** `npm run format` (Prettier)

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

### Known Issues

-   **Vite Manifest Not Found Exception (`Illuminate\Foundation\ViteManifestNotFoundException`)**
    -   **Description:** The Laravel application is unable to locate the `manifest.json` file generated by Vite, resulting in a 500 Internal Server Error when accessing the frontend at `http://127.0.0.1:8000`.
    -   **Status:** Unresolved. Multiple attempts to configure `vite.config.ts` (both frontend and backend), clear caches, and restart servers have not resolved the issue. The `backend/public/build` directory remains empty after `npm run build` in the frontend, despite Vite reporting successful compilation.
    -   **Impact:** Prevents the frontend from being served correctly by the Laravel development server.
    -   **Next Steps:** Further investigation is required to determine why Vite is not writing the `manifest.json` and other build assets to the specified output directory, or why Laravel is not finding them. This may involve deeper debugging of Vite's build process or Laravel's asset serving mechanism.

### Coding Style & Linting

- **PHP / Laravel:**
    - **Standard:** PSR-12.
    - **Tool:** We will use `PHP-CS-Fixer` to automatically enforce the style guide.
- **TypeScript / React:**
    - **Style Guide:** Airbnb's JavaScript Style Guide.
    - **Formatter:** Prettier will be used to auto-format the code.

### React Components

- **Component Style:** We will use **Functional Components with Hooks** exclusively. Class-based components should not be used unless there is a specific, agreed-upon reason.

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

### CHANGELOG.md
- When a development task is completed, I must update the CHANGELOG.md file to document the change. I should add the completed task under the appropriate category (e.g., Added, Changed, Fixed) in the "[Unreleased]" section.

## 7. Command Glossary

### Backend (Laravel)


### Frontend (React + Vite)
- `npm install`: Install Node.js dependencies.
- `npm run dev`: Start the local development server.
- `npm run build`: Build the application for production.
- `npm run test`: Run the Vitest test suite.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run format`: Run Prettier to format the code.

#### Frontend Architecture Notes
The frontend is built with React (using Vite) and TypeScript. It uses `vite-tsconfig-paths` to enable path aliases (e.g., `@/*`) defined in `tsconfig.json`. This allows for cleaner, more maintainable import statements across the application. All new components and pages should use these aliases for imports.

**Path Alias Configuration:**
-   **`vite.config.ts`:** Configured with the `tsconfigPaths()` plugin.
-   **`tsconfig.json`:** Contains the base URL and path mappings. The primary alias is `@/*`, which maps to `src/*`.
-   **`components.json`:** Configured to use the `@/` alias for `shadcn/ui` components.


## 8. Core Data Models

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

### Core Models

1.  **`User` Model:** Represents any registered user.
    -   `role` (enum: `UserRole`): The user's role within the system. Defaults to `VIEWER`.
    -   `location` (string, nullable): The user's general location (e.g., "City, Country").

2.  **`Cat` Model:** Represents the cat's permanent biological and descriptive information.
    -   `location` (string, nullable): The city or area where the cat is located.
    -   `status` (enum: `available`, `fostered`, `adopted`): The current status of the cat.

5.  **`TransferRequest` Model:** Facilitates the formal transfer of a cat between custodians.
    -   `cat_id` (foreign key to `Cat`): The cat being transferred.
    -   `initiator_user_id` (foreign key to `User`): The user initiating the transfer request.
    -   `recipient_user_id` (foreign key to `User`): The user intended to receive the cat.
    -   `status` (enum: `pending`, `accepted`, `rejected`): Current status of the request.
    -   `requested_relationship_type` (enum: `fostering`, `permanent_foster`): The type of custodianship requested.
    -   `created_at`, `accepted_at`, `rejected_at` (timestamps): Dates for request lifecycle.

6.  **`MedicalRecord` Model:** Stores structured medical history for each cat.
    -   `cat_id` (foreign key to `Cat`): The cat this record belongs to.
    -   `record_type` (enum: `vaccination`, `vet_visit`, `medication`, `treatment`, `other`): Type of medical event.
    -   `description` (text): Detailed description of the medical event.
    -   `record_date` (date): The date the medical event occurred.
    -   `vet_name` (string, nullable): Name of the veterinarian or clinic.
    -   `attachment_url` (string, nullable): URL to any attached documents (e.g., vet reports).

7.  **`WeightHistory` Model:** Tracks the weight of a cat over time.
    -   `cat_id` (foreign key to `Cat`): The cat this weight record belongs to.
    -   `weight_kg` (decimal): The recorded weight in kilograms.
    -   `record_date` (date): The date the weight was recorded.

--- 

## 9. Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project, organized into phased milestones. Each phase represents a major step towards the final product, grouping epics and user stories into a logical sequence.

---

### Phase 0: Project Foundation & Setup

**Goal:** Establish the core project infrastructure, including backend and frontend scaffolding, development tools, and documentation setup. This phase ensures a solid foundation for all future development.

---

### Phase 1: Core MVP - Viewing & User Management

**Goal:** Implement the minimum viable product (MVP) functionality. This includes user registration, basic profile management, the ability for admins to add cats, and for the public to view them.

---

### Phase 2: Core Functionality - Applications & Transfers

**Goal:** Build upon the MVP by implementing the core workflows of the application, including the helper application process and the system for transferring cat custodianship.

#### Epic 1: User & Helper Account Management
-   **User Story: API Documentation and Frontend Tests**
    -   **Backend:** Add Swagger (OpenAPI) documentation for all authentication and user profile endpoints.
    -   **Frontend:** Write tests for the `RegisterPage`, `LoginPage`, and `ProfilePage`, mocking API calls. Write tests for the main navigation to ensure it displays correctly for both authenticated and unauthenticated users.

#### Epic 2: Cat Profile & Custodianship Lifecycle

#### Epic 3: Cat Profile Management
-   **User Story: Create and Edit a Cat Profile**
    -   **Scenario:** A `CAT_OWNER` creates a new profile for their cat, providing all necessary details. They can later edit this information.
    -   **Backend:**
        -   Implement `CatController` with CRUD endpoints (`/api/cats`).
        -   Add a `status` field to the `cats` table to track availability (e.g., `available`, `fostered`, `adopted`).
        -   Implement authorization to ensure only the owner or an `ADMIN` can edit/delete the cat.
        -   Add API documentation for the new endpoints.
    -   **Frontend:**
        -   Create a "My Cats" page (`/account/cats`) to display a list of cats owned by the user.
        -   Create a form (`/account/cats/create`, `/account/cats/{id}/edit`) for creating and editing cat profiles.
        -   Write tests for the new components.

---

### Phase 3: Community & Engagement Features

**Goal:** Enhance the platform with features that foster community trust and interaction, such as reviews, comments, and direct messaging.

#### Epic 4: Community Interaction & Communication
-   **User Story 7: Fosterer Comments on Cat Profiles**
    -   **Scenario:** A past or present fosterer adds a public comment to a cat's profile.
    -   **Backend:** New `CatComment` model and endpoints (`GET /api/cats/{id}/comments`, `POST /api/cats/{id}/comments`).
    -   **Frontend:** A comments section on the cat profile page.
-   **User Story 14: Secure In-App Messaging**
    -   **Scenario:** Users communicate directly and securely within the platform.
    -   **Backend:** New `Message` model and associated API endpoints for sending and receiving messages.
    -   **Frontend:** A "Messages" section in the user dashboard.

#### Epic 5: Core Platform & Notifications
-   **User Story 11: Centralized Notification System**
    -   **Scenario:** A user receives a notification about an important event, such as their Helper Profile status changing. They see an indicator in the navigation bar and can view the notification in a dropdown list.
    -   **Backend:**
        -   Create a `Notification` model (`user_id`, `message`, `is_read`, `link`).
        -   Create API endpoints:
            -   `GET /api/notifications`: Fetches all notifications for the authenticated user.
            -   `POST /api/notifications/mark-as-read`: Marks all unread notifications as read.
        -   Implement an event listener that creates a notification when a `HelperProfile` is approved or rejected.
    -   **Frontend:**
        -   Create a `NotificationBell` component in the main navigation bar.
        -   The component will fetch the user's notifications.
        -   It will display a badge with the count of unread notifications.
        -   On click, it will open a dropdown (`DropdownMenu` from shadcn/ui) displaying a list of recent notifications.
        -   When the dropdown is opened, it will call the `POST /api/notifications/mark-as-read` endpoint to mark all notifications as read, and the unread count badge will disappear.
        -   Each notification in the dropdown should be a clickable item that navigates the user to a relevant page (e.g., their helper profile page).

---

### Phase 4: Advanced Features & Polish

**Goal:** Add advanced discovery features and refine the user experience.

#### Epic 3: Public Discovery & Browsing
-   **User Story 9: Browsing and Filtering Available Cats**
    -   **Scenario:** A public user filters the list of available cats based on specific criteria.
    -   **Backend:** Enhanced `GET /api/cats` endpoint with filtering capabilities.
    -   **Frontend:** UI controls for filtering on the cat list page.
-   **User Story 10: Browsing and Filtering Helper Offers**
    -   **Scenario:** A custodian searches for a suitable new home by filtering available helpers.
    -   **Backend:** `GET /api/helper-profiles` endpoint (Not yet implemented - needs to be added with filtering and sorting capabilities).
    -   **Frontend:** UI controls for filtering and sorting on the helper list page.

---
## 10. Authentication

To ensure secure user access, we will implement the following authentication features:

-   **Standard Login/Registration:**
    -   Users will register and log in using an email address and password.
    -   **Password Reset/Forgot Password:** Backend endpoints and frontend forms for users to securely reset their passwords via email.
    -   **Email Verification:** New user registrations will require email verification to ensure valid email addresses and enhance security.
    -   **Rate Limiting:** Implement rate limiting on authentication endpoints to prevent brute-force attacks.

### Frontend: React Context & Axios Interceptors

The frontend uses React Context to manage authentication state globally. An `AuthProvider` component wraps the application, providing user data and auth functions (`login`, `logout`, etc.) to any component through a `useAuth` hook. API requests are handled by Axios, which uses an interceptor to automatically attach the user's authentication token to every outgoing request.

## 11. Production Deployment and Operations

To ensure a smooth and reliable deployment process, we will consider the following:

-   **Environment Variable Management:** Securely manage environment variables in production (e.g., using Docker secrets or cloud provider secrets management).
-   **Database Migrations:** Outline a strategy for running database migrations in a production environment (e.g., as part of a deployment script).
-   **CI/CD Pipeline:** Consider implementing a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing and deployment, reducing manual errors and speeding up releases.

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

## 12. User Preferences

- **Collaboration Style:** Iterative, feedback-driven.
- **Command Style:** Imperative (e.g., "Refactor this function", "Write a test for the login API").
- **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.

---
## 13. Success Metrics & Tracking

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
## 14. Self-Service Operations & Community Moderation

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
## 15. Mobile Strategy

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
## 16. Community Feedback & Iteration

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

## Linting and Formatting Before Build

To ensure code quality and consistent formatting, the frontend build process now automatically includes linting and formatting steps.

When you run `npm run build` in the `frontend` directory, it will first run `eslint` to check for any linting errors and then `prettier` to format the code before proceeding with the TypeScript compilation and Vite build.

This is configured in `frontend/package.json`:

```json
"scripts": {
  "build": "npm run lint && npm run format && tsc -b && vite build",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

This ensures that all code pushed to production is clean and adheres to our coding standards without requiring manual checks.

## Frontend File Structure

```
frontend/
├───.gitignore
├───.prettierignore
├───.prettierrc
├───components.json
├───dev-additions.json
├───eslint.config.js
├───index.html
├───package-lock.json
├───package.json
├───postcss.config.js
├───README.md
├───tailwind.config.js
├───tsconfig.app.json
├───tsconfig.json
├───tsconfig.node.json
├───vite.config.ts
├───public/
│   └───vite.svg
└───src/
    ├───App.css
    ├───App.tsx
    ├───index.css
    ├───main.tsx
    ├───setupTests.ts
    ├───vite-env.d.ts
    ├───api/
    ├───assets/
    ├───components/
    │   ├───CatCard.tsx
    │   ├───CatsSection.tsx
    │   ├───ChangePasswordForm.tsx
    │   ├───DeleteAccountDialog.tsx
    │   ├───Footer.test.tsx
    │   ├───Footer.tsx
    │   ├───HeroSection.tsx
    │   ├───HomeButton.tsx
    │   ├───LoginForm.test.tsx
    │   ├───LoginForm.tsx
    │   ├───MainNav.tsx
    │   ├───NotificationBell.test.tsx
    │   ├───NotificationBell.tsx
    │   ├───RegisterForm.test.tsx
    │   ├───RegisterForm.tsx
    │   ├───theme-provider.tsx
    │   ├───UserMenu.tsx
    │   └───ui/
    │       ├───alert-dialog.tsx
    │       ├───avatar.tsx
    │       ├───badge.tsx
    │       ├───button.tsx
    │       ├───card.tsx
    │       ├───dialog.tsx
    │       ├───dropdown-menu.tsx
    │       ├───form.tsx
    │       ├───input.tsx
    │       ├───label.tsx
    │       ├───sonner.tsx
    │       └───toast.tsx
    ├───contexts/
    │   └���──AuthContext.tsx
    ├───hooks/
    │   └───useAuth.ts
    ├───lib/
    │   └───utils.ts
    ├───mocks/
    │   ├───handlers.ts
    │   └───server.ts
    ├───pages/
    │   ├───HomePage.tsx
    │   ├───LoginPage.tsx
    │   ├───MainPage.test.tsx
    │   ├───MainPage.tsx
    │   ├───NotFoundPage.tsx
    │   ├───ProfilePage.tsx
    │   ├───RegisterPage.tsx
    │   └───account/
    │       └───MyCatsPage.tsx
    ├───services/
    │   └───authService.ts
    └───types/
        └───index.ts
```
