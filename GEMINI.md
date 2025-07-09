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

-   **My Account (`/account`):** A central dashboard for personal activities.
-   **My Cats:** Manage cats currently under the user's custodianship.
-   **My Helper Profile:** Create or edit their application to be a helper.
-   **Notifications:** View alerts and updates related to their activities.

### Admin Dashboard (For rescue staff only)

-   **Admin Home (`/admin`):** A private dashboard with operational overviews.
-   **Manage Cats:** Add new cats and view/edit all cats in the system.
-   **Manage Applications:** Review and approve/reject helper applications.
-   **Manage Users:** View all users and manage admin privileges.
-   **Manage Transfers:** View a complete history of all custodianship changes.

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

-   **My Account (`/account`):** A central dashboard for personal activities.
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
- **Database:** PostgreSQL
- **Deployment:** Docker Compose (Images will be stored on the same VPS as the application, not in cloud storage initially).

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

### Testing

- **TDD for New Features:** All new features must begin with a failing test that defines the desired functionality. This is the default approach for adding anything new.
- **Fixes & Refactoring:** The TDD rule is not strictly required for minor bug fixes or code improvements where it's impractical.
- **Default Frameworks:**
    - **Laravel (Backend):** Pest
    - **React (Frontend):** Vitest with React Testing Library (RTL)

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

## 7. Command Glossary

### Backend (Laravel)
- `composer install`: Install PHP dependencies.
- `php artisan serve`: Start the local development server.
- `php artisan migrate`: Run database migrations.
- `php artisan test`: Run the Pest test suite.
- `./vendor/bin/php-cs-fixer fix`: Automatically fix code style issues.

### Frontend (React + Vite)
- `npm install`: Install Node.js dependencies.
- `npm run dev`: Start the local development server.
- `npm run build`: Build the application for production.
- `npm run test`: Run the Vitest test suite.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run format`: Run Prettier to format the code.

## 8. Core Data Models

Based on user feedback, we are architecting a **Rescue Management System**. The core concept is tracking **Cat Custodianship** over time, providing a full, auditable history for each animal.

**User Roles & Permissions:** The system has a fluid role model. A single user account can both offer help (by creating a `HelperProfile`) and manage cats for whom they are the current custodian. Permissions are contextual:
-   **Admin (`is_admin: true`):** A user associated with the main rescue organization. They can manage all cats and all helper applications.
-   **Custodian (Regular User):** A user who is currently responsible for a cat (e.g., fostering it). They can manage and initiate transfers for *only the cats in their care*.

### Core Models

1.  **`User` Model:** Represents any registered user.
    -   `is_admin` (boolean): Grants system-wide administrative privileges.

2.  **`Cat` Model:** Represents the cat's permanent biological and descriptive information.
    -   `city_id` (foreign key to `City`, nullable): The city where the cat is located.

3.  **`HelperProfile` Model:** An **application form** for users who want to become approved fosterers or adopters.
    -   `approval_status` (enum: `pending`, `approved`, `rejected`): Managed by admins.
    -   `city_id` (foreign key to `City`, nullable): The city where the helper is located.

4.  **`Custodianship` Model (New Core):** Links a Cat to a User, defining their relationship over time.
    -   `relationship_type` (enum: `rescue_org`, `fostering`, `permanent_foster`).
    -   `start_date`, `end_date` (nullable): Defines the active period.

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

8.  **`Province` Model:** Represents a geographical province or state.
    -   `id` (primary key)
    -   `name` (string): Name of the province.

9.  **`City` Model:** Represents a geographical city, linked to a province.
    -   `id` (primary key)
    -   `province_id` (foreign key to `Province`)
    -   `name` (string): Name of the city.

--- 

## 9. Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project, organized into phased milestones. Each phase represents a major step towards the final product, grouping epics and user stories into a logical sequence.

---

### Phase 0: Project Foundation & Setup

**Goal:** Establish the core project infrastructure, including backend and frontend scaffolding, development tools, and documentation setup. This phase ensures a solid foundation for all future development.

-   **Task:** Initialize a new Laravel project for the backend API.
-   **Task:** Initialize a new React project (using Vite) for the frontend SPA.
-   **Task:** Configure `PHP-CS-Fixer` for the Laravel backend to enforce PSR-12 coding standards.
-   **Task:** Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend to ensure consistent code style.
-   **Task:** Install and configure an OpenAPI package (e.g., `l5-swagger`) for the Laravel backend to define and document the API contract.
-   **Task:** Set up a static site generator (e.g., VitePress) for the `docs/` directory to create a navigable documentation website.

---

### Phase 1: Core MVP - Viewing & User Management

**Goal:** Implement the minimum viable product (MVP) functionality. This includes user registration, basic profile management, the ability for admins to add cats, and for the public to view them.

#### Epic 1: User & Helper Account Management
-   **User Story 12: User Profile Management**
    -   **Scenario:** A registered user wants to view or update their personal account information.
    -   **Backend:** `GET /api/users/me`, `PUT /api/users/me`.
    -   **Frontend:** A "My Profile" section in the user dashboard.

#### Epic 2: Cat Profile & Custodianship Lifecycle
-   **User Story 1: Admin Onboards a New Cat**
    -   **Scenario:** An admin adds a newly rescued cat to the system.
    -   **Backend:** `POST /api/admin/cats`.
    -   **Frontend:** An admin-only form at `/admin/cats/new`.

#### Epic 3: Public Discovery & Browsing
-   **User Story 4: Public User Browses Available Cats**
    -   **Scenario:** A visitor browses all available cats.
    -   **Backend:** `GET /api/cats`.
    -   **Frontend:** A public gallery at `/cats`.
-   **User Story 5: Viewing the Dynamic Cat Profile Page**
    -   **Scenario:** A user views a cat's profile page, seeing different information based on their role (Public, Admin, etc.).
    -   **Backend:** An intelligent `GET /api/cats/{id}` endpoint that returns data and a `viewer_permissions` object.
    -   **Frontend:** A declarative component that renders based on the `viewer_permissions` object.

#### Epic 5: Core Platform & Notifications
-   **User Story 8: The Public Homepage**
    -   **Scenario:** A new visitor arrives at the main landing page.
    -   **Backend:** `GET /api/cats/featured`.
    -   **Frontend:** A homepage with a hero section, featured cats, and a footer.

---

### Phase 2: Core Functionality - Applications & Transfers

**Goal:** Build upon the MVP by implementing the core workflows of the application, including the helper application process and the system for transferring cat custodianship.

#### Epic 1: User & Helper Account Management
-   **User Story 2: New User Applies to Help**
    -   **Scenario:** A new user applies to become an approved fosterer or adopter.
    -   **Backend:** `POST /api/helper-profiles`, plus admin endpoints for review.
    -   **Frontend:** A public form at `/apply-to-help` and an admin dashboard at `/admin/applications`.
-   **User Story 15: User Views Helper Application Status**
    -   **Scenario:** A user checks the status of their helper application.
    -   **Backend:** `GET /api/helper-profiles/me`.
    -   **Frontend:** A dedicated section in the user's dashboard.

#### Epic 2: Cat Profile & Custodianship Lifecycle
-   **User Story 3: Managing & Transferring Cat Custodianship**
    -   **Scenario:** An admin or current fosterer initiates a transfer of a cat to a new user.
    -   **Backend:** New `TransferRequest` model and endpoints (`POST /api/cats/{cat_id}/transfer-request`, `POST /api/transfer-requests/{id}/accept`, `POST /api/transfer-requests/{id}/reject`).
    -   **Frontend:** UI for initiating, viewing, and acting on transfer requests.
-   **User Story 13: Custodian Manages Cat Profile**
    -   **Scenario:** A cat's current custodian updates its profile or adds medical/weight records.
    -   **Backend:** `PUT /api/cats/{id}`, `POST /api/cats/{id}/medical-records`, `POST /api/cats/{id}/weight-history`.
    -   **Frontend:** Editing forms on the cat profile page, visible only to the custodian/admin.

---

### Phase 3: Community & Engagement Features

**Goal:** Enhance the platform with features that foster community trust and interaction, such as reviews, comments, and direct messaging.

#### Epic 4: Community Interaction & Communication
-   **User Story 6: User Reputation and Reviews**
    -   **Scenario:** A previous custodian leaves a review for a fosterer after a successful transfer.
    -   **Backend:** New `Review` model and endpoints (`POST /api/reviews`, `GET /api/users/{id}/reviews`).
    -   **Frontend:** Prompts to leave reviews and public display of ratings on helper profiles.
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
    -   **Scenario:** Users receive alerts for important events.
    -   **Backend:** New `Notification` model and event-driven creation of notifications.
    -   **Frontend:** A notification indicator and a dedicated page to view notifications.

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
    -   **Backend:** Enhanced `GET /api/helper-profiles` endpoint with filtering and sorting.
    -   **Frontend:** UI controls for filtering and sorting on the helper list page.

---
## 10. Authentication

To ensure secure user access, we will implement the following authentication features:

-   **Standard Login/Registration:**
    -   Users will register and log in using an email address and password.
    -   **Password Reset/Forgot Password:** Backend endpoints and frontend forms for users to securely reset their passwords via email.
    -   **Email Verification:** New user registrations will require email verification to ensure valid email addresses and enhance security.
    -   **Rate Limiting:** Implement rate limiting on authentication endpoints to prevent brute-force attacks.

## 11. Production Deployment and Operations

To ensure a smooth and reliable deployment process, we will consider the following:

-   **Environment Variable Management:** Securely manage environment variables in production (e.g., using Docker secrets or cloud provider secrets management).
-   **Database Migrations:** Outline a strategy for running database migrations in a production environment (e.g., as part of a deployment script).
-   **CI/CD Pipeline:** Consider implementing a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing and deployment, reducing manual errors and speeding up releases.

## 12. User Preferences

- **Collaboration Style:** Iterative, feedback-driven.
- **Command Style:** Imperative (e.g., "Refactor this function", "Write a test for the login API").
- **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.
