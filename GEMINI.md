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
- **Frontend:** React.js (JavaScript) - Single Page Application
- **Database:** PostgreSQL
- **Deployment:** Docker Compose (Images will be stored on the same VPS as the application, not in cloud storage initially).

## 4. Internationalization (i18n)

To support multiple languages, we will implement the following:

-   **Backend (Laravel):** Use Laravel's built-in localization features. All user-facing strings will be stored in language files.
-   **Frontend (React):** Use a library like `react-i18next` or `formatjs` for managing translations.
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
    - **React (Frontend):** Jest with React Testing Library (RTL)

### Coding Style & Linting

- **PHP / Laravel:**
    - **Standard:** PSR-12.
    - **Tool:** We will use `PHP-CS-Fixer` to automatically enforce the style guide.
      *(Note: `PHP-CS-Fixer` is a command-line tool that automatically reformats PHP code to follow standards like PSR-12. It helps keep the codebase clean and consistent without manual effort.)*
- **JavaScript / React:**
    - **Style Guide:** Airbnb's JavaScript Style Guide.
    - **Formatter:** Prettier will be used to auto-format the code.

### React Components

- **Component Style:** We will use **Functional Components with Hooks** exclusively. Class-based components should not be used unless there is a specific, agreed-upon reason.

### Documentation

We treat documentation as an integral part of the project, maintained alongside the code.

-   **Location:** All project documentation is organized within the top-level `docs/` directory.
-   **Format:** Documentation files are written in Markdown.
-   **Maintenance:**
    -   Documentation should be version-controlled and updated with relevant code changes.
    -   New features, significant changes, or bug fixes should include corresponding documentation updates.
    -   Regular reviews will be conducted to ensure accuracy and completeness.
-   **Tooling:** We aim to use a static site generator (e.g., VitePress, Docusaurus, MkDocs) to render the Markdown files into a navigable website, deployable via GitHub Pages.

### Error Handling and User Feedback

To ensure a consistent and user-friendly experience, we will standardize error handling:

-   **API Error Format:** Define a consistent JSON structure for API error responses, including a clear error code, message, and optional details for validation errors.
-   **Frontend Error Display:** Implement centralized mechanisms for displaying user-friendly error messages on the frontend, guiding users on how to resolve issues.
-   **Backend Error Logging:** Integrate centralized error logging on the backend to capture and monitor issues for debugging and operational insights.

## 7. Command Glossary

*(This section can be updated with any custom commands or aliases we establish.)*

## 8. Decompose (Custodianship Model)

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

### User Story 1: Admin Onboards a New Cat

**Scenario:** An admin from the rescue team adds a newly rescued cat to the system.

-   **Backend:** `POST /api/admin/cats` (admin-only). Creates the `Cat` and its initial `Custodianship` record (`type: rescue_org`).
-   **Frontend:** An admin-only form at `/admin/cats/new`.

### User Story 2: New User Applies to Help

**Scenario:** A new user registers and applies to become an approved fosterer or adopter.

-   **Backend:** `POST /api/helper-profiles` (user submits form). Admin-only endpoints to list and approve/reject applications.
-   **Frontend:** A public form at `/apply-to-help`. An admin dashboard at `/admin/applications`.

### User Story 3: Managing & Transferring Cat Custodianship (with Transfer Request System)

**Scenario:** An admin, or a user who is the current fosterer, wants to transfer a cat to a new home. This process now involves a formal request and acceptance.

-   **Backend:**
    -   **New `TransferRequest` Model:** Contains `cat_id`, `initiator_user_id`, `recipient_user_id`, `status` (enum: `pending`, `accepted`, `rejected`), `requested_relationship_type`, `created_at`, `accepted_at`, `rejected_at`.
    -   **Endpoint: `POST /api/cats/{cat_id}/transfer-request`:**
        -   **Authorization:** The API will check if the logged-in user is an admin OR the cat's current custodian.
        -   **Action:** Creates a new `TransferRequest` record with `status: pending`.
    -   **Endpoint: `POST /api/transfer-requests/{id}/accept`:**
        -   **Authorization:** Only the `recipient_user_id` can accept.
        -   **Action:** Updates `TransferRequest` status to `accepted`. Ends the current `Custodianship` and begins a new one with the new user and `requested_relationship_type`.
    -   **Endpoint: `POST /api/transfer-requests/{id}/reject`:**
        -   **Authorization:** Only the `recipient_user_id` can reject.
        -   **Action:** Updates `TransferRequest` status to `rejected`.
-   **Frontend:**
    -   On a cat's detail page, a "Propose Transfer" button is visible only to the admin or the current custodian.
    -   The UI will allow selecting another approved user for the transfer and the proposed relationship type.
    -   The recipient user will receive a notification (via the new Notification System) about the pending transfer request.
    -   The recipient user's dashboard will have a section to view and "Accept" or "Reject" incoming transfer requests.
    -   The cat's profile will show the status of any pending transfer requests.

### User Story 4: Public User Browses Available Cats

**Scenario:** A visitor to the website wants to see all cats that are looking for a home.

-   **Backend:** `GET /api/cats`. This will return a list of all cats whose latest `Custodianship` status is *not* `permanent_foster`.
-   **Frontend:** A public gallery at `/cats` displaying `CatCard` components. Each card links to the cat's detailed public profile.

### User Story 5: Viewing the Dynamic Cat Profile Page

**Scenario:** A user views a cat's profile page. The information and actions they can take must change based on their relationship to the cat.

-   **Backend:** The `GET /api/cats/{id}` endpoint will be the intelligent core of this feature.
    -   It will inspect the authenticated user's token to identify them.
    -   It will determine the user's relationship to the cat (Admin, Current Custodian, Approved Helper, or Public User).
    -   It will return a JSON object containing the public `cat` data, any private data the user is allowed to see (like medical records), and a `viewer_permissions` object that explicitly tells the frontend what to display.

-   **Frontend:** The Cat Profile component will be simple and declarative.
    -   It will fetch the data and permissions object from the API.
    -   It will use conditional rendering to show/hide elements:
        -   An "Edit Profile" button is shown if `permissions.can_edit_full_profile` is true.
        -   A "Request Adoption" button is shown if `permissions.can_request_adoption` is true.
        -   The medical records section is rendered if that data is present in the response.

### User Story 6: User Reputation and Reviews

**Scenario:** To build trust, the user who gives a cat to a fosterer can leave a review about their experience.

-   **Backend:**
    -   **New `Review` Model:** Contains `reviewee_id` (the fosterer), `reviewer_id` (the previous custodian), `custodianship_id` (to link it to a specific fostering event), `rating`, and `comment`.
    -   **New Endpoint:** `POST /api/reviews`. The API will have strict authorization to ensure only the direct previous custodian can leave a review for a specific fostering period, and only once.
    -   **New Endpoint:** `GET /api/users/{id}/reviews` to display a user's public reputation.
-   **Frontend:**
    -   After a transfer is completed, the previous custodian is prompted to leave a review.
    -   A user's public `HelperProfile` will show their average rating and a list of reviews.

### User Story 7: Fosterer Comments on Cat Profiles

**Scenario:** A past or present fosterer wants to add a public update or comment to a cat's profile.

-   **Backend:**
    -   **New `CatComment` Model:** Contains `cat_id`, `user_id` (author), and `comment` text.
    -   The `GET /api/cats/{id}` response will be updated to include a `viewer_permissions.can_post_comment` boolean flag.
    -   **New Endpoints:** `GET /api/cats/{id}/comments` to fetch all comments, and `POST /api/cats/{id}/comments` to add a new one. The POST endpoint will only allow users who have a past or present `Custodianship` record for the cat.
-   **Frontend:**
    -   The Cat Profile page will have a new "Comments" section.
    -   A form to add a comment will only be visible if the `can_post_comment` permission is true.

### User Story 8: The Public Homepage

**Scenario:** A new visitor arrives at the main landing page of the application.

-   **Backend:**
    -   **New Endpoint:** `GET /api/cats/featured`. This lightweight endpoint will return a small, curated list of 3-4 recently added cats who are available for adoption, providing just enough data for a preview card.
-   **Frontend:** The homepage will be composed of three main sections.
    1.  **Hero Section:** A static, full-width section at the top with a welcoming message, a brief explanation of the rescue's mission, and primary call-to-action buttons ("See Our Cats", "Apply to Help").
    2.  **Featured Cats Widget:** A dynamic section that calls the `/api/cats/featured` endpoint and displays a small grid of `CatCard` previews for the cats returned.
    3.  **Footer:** A static, reusable site-wide footer containing links to social media, other site pages (About, Contact), and a link to the project's GitHub repository.

### User Story 9: Browsing and Filtering Available Cats

**Scenario:** A public user wants to browse the list of all available cats and filter them based on specific criteria.

-   **Backend:**
    -   **Model Update:** The `Cat` model will be updated with fields to support filtering: `is_seeking` (enum: `foster`, `permanent`), `foster_type` (enum: `voluntary`, `paid`), and `foster_fee_per_day` (decimal).
    -   **Enhanced Endpoint:** The `GET /api/cats` endpoint will be enhanced to support pagination (`?page=...`) and a variety of query parameter filters, such as `?availability=permanent`, `?compensation=paid`, and `?city=Hanoi`.
-   **Frontend:**
    -   **`CatListPage` Component:** This component will manage the state for the active filters and the current page.
    -   **Filter UI:** A dedicated UI section with dropdowns and inputs will allow users to select their filter criteria.
    -   **Dynamic Fetching:** When the user applies filters or changes pages, the component will re-fetch the data from the API with the new parameters and update the list of cats displayed.

### User Story 10: Browsing and Filtering Helper Offers

**Scenario:** A cat custodian (an admin or a fosterer) needs to find a suitable new home for a cat in their care.

-   **Backend:**
    -   **Enhanced Endpoint:** The `GET /api/helper-profiles` endpoint will be enhanced to support pagination, filtering, and sorting.
    -   **Filters:** `?service_type=...`, `?compensation=...`, `?city=...`
    -   **Sorting:** `?sort_by=rating_desc`, `?sort_by=price_asc`, etc. The backend will handle the logic for calculating average ratings on the fly.
-   **Frontend:**
    -   **`HelperListPage` Component:** This component at `/helpers` will manage the UI for searching for helpers.
    -   **Filter & Sort UI:** A control panel will allow users to select their desired criteria.
    -   **Dynamic Fetching:** Applying filters or sorting will trigger a new API call with the appropriate query parameters and update the list of displayed `HelperCard`s.

### User Story 11: Centralized Notification System

**Scenario:** Users need to be informed about important events related to their activities (e.g., new transfer requests, accepted applications, new comments on their cats).

-   **Backend:**
    -   **New `Notification` Model:** Contains `user_id` (recipient), `message` (text), `link` (URL to relevant page), `is_read` (boolean, default false), `created_at`.
    -   **New Endpoint: `GET /api/notifications`:** Returns a list of notifications for the authenticated user, with optional filtering for `is_read`.
    -   **New Endpoint: `POST /api/notifications/{id}/mark-as-read`:** Marks a specific notification as read.
    -   **Event-driven Notification Creation:** The backend will create `Notification` records whenever relevant events occur (e.g., a `TransferRequest` is created, a `HelperProfile` is approved).
-   **Frontend:**
    -   A prominent UI element (e.g., a bell icon in the header) will display the count of unread notifications.
    -   Clicking the notification icon will show a dropdown or a dedicated page listing all notifications.
    -   Notifications will link to the relevant pages within the application.

## 9. Authentication

To ensure secure and flexible user access, we will implement the following authentication features:

-   **Standard Login/Registration:**
    -   **Password Reset/Forgot Password:** Backend endpoints and frontend forms for users to securely reset their passwords via email.
    -   **Email Verification:** New user registrations will require email verification to ensure valid email addresses and enhance security.
    -   **Rate Limiting:** Implement rate limiting on authentication endpoints to prevent brute-force attacks.
-   **Social Logins:**
    -   **Providers:** Support login via Google and Facebook.
    -   **Admin Configuration:** The admin panel will provide an interface for configuring API keys and secrets for social login providers, allowing rescue organizations to enable/disable these options as needed.

## 10. TODOs

- [ ] **Setup Project Scaffolding:**
    - [ ] Initialize a new Laravel project.
    - [ ] Initialize a new React project (e.g., with Vite or Create React App).
- [ ] **Configure Linting & Formatting:**
    - [ ] Set up `PHP-CS-Fixer` for the Laravel backend.
    - [ ] Set up `ESLint` (with Airbnb config) and `Prettier` for the React frontend.
- [ ] **API Contract Definition (Swagger/OpenAPI):**
    - [ ] Install a Laravel OpenAPI Package (e.g., `darkaonline/l5-swagger`).
    - [ ] Configure the Package.
    - [ ] Annotate API Endpoints in Laravel controllers/models.
    - [ ] Generate OpenAPI documentation.
    - [ ] Serve Swagger UI.

## 11. Production Deployment and Operations

To ensure a smooth and reliable deployment process, we will consider the following:

-   **Environment Variable Management:** Securely manage environment variables in production (e.g., using Docker secrets or cloud provider secrets management).
-   **Database Migrations:** Outline a strategy for running database migrations in a production environment (e.g., as part of a deployment script).
-   **CI/CD Pipeline:** Consider implementing a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing and deployment, reducing manual errors and speeding up releases.

## 12. User Preferences

- **Collaboration Style:** Iterative, feedback-driven.
- **Command Style:** Imperative (e.g., "Refactor this function", "Write a test for the login API").
- **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.
