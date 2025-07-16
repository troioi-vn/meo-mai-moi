## Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project. For a history of the original user stories, see `tmp/user_stories.md`.

---

### Phase 0: Project Foundation & Setup
- **Status:** `Done`
- **Goal:** Establish the core project infrastructure, including backend and frontend scaffolding, development tools, and documentation setup.

#### Infrastructure & DevOps
- **Task: Docker Optimization**
  - **Status:** `Done`
  - **Notes:** Implemented multi-stage builds with optimized caching and permission management.
  - **Backend:**
    - [x] Multi-stage Docker build with frontend and backend integration
    - [x] Composer dependency caching optimization
    - [x] User context switching for security
    - [x] Content Security Policy configuration for Alpine.js
- **Task: Admin Panel Access Control**
  - **Status:** `Done`
  - **Notes:** Implemented proper Filament admin panel access control and permissions.
  - **Backend:**
    - [x] FilamentUser contract implementation
    - [x] canAccessPanel method for role-based access
    - [x] FilamentShield permission generation
    - [x] Super admin role with full permissions
- **Task: Database Setup Automation**
  - **Status:** `Done`
  - **Notes:** Streamlined database migration and seeding process.
  - **Backend:**
    - [x] Automated migration execution
    - [x] Role and permission seeding
    - [x] Admin user creation with proper credentials
    - [x] Error handling for duplicate data

---

### Phase 1: Core MVP - Viewing & User Management
- **Status:** `Done`
- **Goal:** Implement the minimum viable product (MVP) functionality. This includes user registration, basic profile management, the ability for admins to add cats, and for the public to view them.

#### Epic 0: Admin Panel Setup
- **Task: Filament Admin Panel Integration**
  - **Status:** `Done`
  - **Notes:** Integrated Filament for admin functionalities, including user management, roles, and permissions.
  - **Backend:**
    - [x] Install and configure `filament/filament`.
    - [x] Integrate `bezhansalleh/filament-shield` for role and permission management.
    - [x] Configure `tomatophp/filament-users` for user management with Shield integration and impersonation.

#### Epic 1: Admin Panel Features
- **Task: Add Cats to Admin Panel**
  - **Status:** `To Do`
  - **Notes:** Implement the functionality to manage cat profiles directly within the Filament admin panel.
  - **Backend:**
    - [ ] Create Filament Resource for Cat model.
    - [ ] Implement CRUD operations for cats.
    - [ ] Add necessary fields for cat attributes (e.g., name, breed, age, status).
  - **Frontend:**
    - [ ] Ensure admin panel UI for cats is intuitive and user-friendly.

---

### Phase 2: Core Functionality - Applications & Transfers
- **Goal:** Build upon the MVP by implementing the core workflows of the application, including the helper application process and the system for transferring cat custodianship.

#### Epic 1: User & Helper Account Management
- **Task: API Documentation & Tests**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Add Swagger docs for auth endpoints
  - **Frontend:**
    - [ ] Write tests for `RegisterPage`, `LoginPage`, `ProfilePage`
    - [ ] Write tests for main navigation
- **Task: User Avatar Management**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] API endpoint for avatar upload
    - [ ] Store avatar path in `User` model
  - **Frontend:**
    - [ ] Add upload button to `ProfilePage`
    - [ ] Display avatar on `ProfilePage`

#### Epic 3: Cat Profile Management
- **Task: Create/Edit Cat Profile**
  - **Status:** `Done`
  - **Backend:**
    - [x] Implement `CatController` CRUD
    - [x] Add `status` field to `Cat` model (including 'dead' status)
    - [ ] Implement flexible birthday fields (`year`, `month`, `day`)
    - [ ] Add API documentation
  - **Frontend:**
    - [x] Create "My Cats" page with deceased cats toggle
    - [x] Create `Create/Edit Cat` form
    - [ ] Calculate and display age from birthday
    - [x] Write tests for new components
    - [x] Comprehensive test coverage for all cat management functionality
- **Task: Cat Profile Permissions & Navigation**
  - **Status:** `Done`
  - **Backend:**
    - [x] Optional authentication middleware for public routes
    - [x] Ownership-based permission system
    - [x] API tests for optional auth middleware
    - [x] Unit tests for ownership permission logic
  - **Frontend:**
    - [x] Fixed `/cats/:id` routing
    - [x] Conditional edit/navigation buttons for owners
    - [x] Component tests for conditional button rendering
    - [x] Routing tests for fixed `/cats/:id` route
    - [ ] Integration tests for complete cat profile workflow
    - [ ] E2E tests for user journey (view cat → see edit button → edit cat)
- **Task: Delete a Cat Profile**
  - **Status:** `Done`
  - **Backend:**
    - [x] Implement `DELETE /api/cats/{id}`
  - **Frontend:**
    - [x] Add delete button to UI
    - [x] Add confirmation dialog
- **Task: Manage Cat Profile Photos**
  - **Status:** `Done`
  - **Backend:**
    - [x] Endpoints for photo upload
    - [x] Endpoints for photo deletion
  - **Frontend:**
    - [x] UI controls for photo management
  - **Testing:**
    - [x] Comprehensive feature tests for upload, resize, and delete functionality.
- **Task: Enhanced Cat Removal**
  - **Status:** `Done`
  - **Notes:** Implemented a comprehensive multi-step process to prevent accidental cat profile deletion and allow marking cats as deceased.
  - **Backend:**
    - [x] Create an endpoint that verifies user password (`POST /api/auth/verify-password`)
    - [x] Modify the delete endpoint to accept a `status` change to 'dead' as an alternative to deletion
    - [x] Ensure the password check is enforced before any destructive action
    - [x] Filter deceased cats from public listings by default
  - **Frontend:**
    - [x] Create a multi-step modal for the removal process (`EnhancedCatRemovalModal.tsx`)
    - [x] Step 1: Ask the user to type the cat's name to confirm
    - [x] Step 2: Present two buttons: `Delete Permanently` and `Mark as Deceased`
    - [x] Step 3: Require the user to enter their password to finalize the action
    - [x] Add toggle switch on "My Cats" page to show/hide deceased cats
    - [x] Comprehensive test coverage for all new components and functionality


#### Epic 4: Grab This Cat Feature
- **Task: "Grab This Cat" Feature**
  - **Status:** `Planned`
  - **Backend:**
    - [x] Update `Cat` model (`status`)
    - [x] `POST /api/transfer-requests` endpoint
    - [x] Notification integration
  - **Frontend:**
    - [ ] Add filters to cat list page
    - [ ] Create "Grab this cat" modal
    - [ ] Add button to `CatProfilePage`
    - [ ] Integrate `NotificationBell`

---

### Phase 3: Community & Engagement Features
- **Goal:** Enhance the platform with features that foster community trust and interaction, such as reviews, comments, and direct messaging.

#### Epic 4: Community Interaction & Communication
- **Task: Fosterer Comments**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] `CatComment` model & endpoints
  - **Frontend:**
    - [ ] Comments section on cat profile
- **Task: Secure In-App Messaging**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] `Message` model & endpoints
  - **Frontend:**
    - [ ] "Messages" section in dashboard

#### Epic 5: Core Platform & Notifications
- **Task: Centralized Notifications**
  - **Status:** `Planned`
  - **Backend:**
    - [ ] `Notification` model & endpoints
    - [ ] Event listener for `HelperProfile` status
  - **Frontend:**
    - [ ] `NotificationBell` component
    - [ ] Dropdown list for notifications
    - [ ] Mark as read functionality

---

### Phase 4: Advanced Features & Polish
- **Goal:** Add advanced discovery features and refine the user experience.

#### Epic 3: Public Discovery & Browsing
- **Task: Filter Available Cats**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Enhance `GET /api/cats` with filters
  - **Frontend:**
    - [ ] UI controls for filtering
- **Task: Filter Helper Offers**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] `GET /api/helper-profiles` endpoint with filters
  - **Frontend:**
    - [ ] UI controls for filtering

#### Epic 4: UI & UX Polish
- **Task: Display Real Cats on Homepage**
  - **Status:** `To Do`
  - **Notes:** Replace the static, hardcoded cat cards on the main page with a dynamic list of cats fetched from the API.
  - **Frontend:**
    - [ ] Fetch a list of available cats from the `/api/cats` endpoint.
    - [ ] Map the fetched data to the `CatCard` component.
    - [ ] Ensure the layout is responsive and handles various numbers of cats gracefully.

#### Epic 5: Medical Records Management
- **Task: Track Cat Weight**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Add `WeightHistory` model and migration.
    - [ ] Implement API endpoints for adding and viewing weight records.
  - **Frontend:**
    - [ ] Add a "Track Weight" button to cat profile.
    - [ ] Implement UI for adding new weight entries.
    - [ ] Display weight history (e.g., chart or list) on cat profile.
- **Task: Manage Vaccination Records**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Add `MedicalRecord` model and migration (for vaccinations).
    - [ ] Implement API endpoints for adding and viewing vaccination records.
  - **Frontend:**
    - [ ] Add a "Vaccination Record" button to cat profile.
    - [ ] Implement UI for adding new vaccination entries.
    - [ ] Display vaccination history on cat profile.

---

### Phase 5: Deployment & Maintenance
- **Goal:** Prepare the application for production deployment and establish long-term maintenance practices.

#### Epic 6: Production Readiness
- **Task: API Contract Testing**
  - **Status:** `Done`
  - **Backend:**
    - [x] Generate `openapi.json`
    - [x] Add contract tests to CI
- **Task: Deployment & CI/CD**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Set up production environment
    - [ ] Create CI/CD pipeline
- **Task: Internationalization (i18n)**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Implement Laravel localization
  - **Frontend:**
    - [ ] Integrate `react-i18next`

#### Epic 7: Deployment & Demo Server
- **Task: Prepare VPS for Demo/Dev Server**
  - **Status:** `Partially Done`
  - **Notes:** Infrastructure and deployment documentation has been prepared. Docker optimization completed for production-ready builds.
  - **Deployment:**
    - [x] Docker optimization with multi-stage builds
    - [x] Database setup automation
    - [x] Admin panel configuration
    - [x] Content Security Policy setup
    - [ ] Provision a VPS instance
    - [ ] Install necessary software (Docker, Nginx, PostgreSQL, etc.)
    - [ ] Configure firewall and security settings
- **Task: Deploy Demo Server**
  - **Status:** `Ready for Deployment`
  - **Notes:** Application is production-ready with optimized Docker builds and automated setup procedures.
  - **Deployment:**
    - [x] Prepare deployment documentation and procedures
    - [x] Configure Nginx with CSP headers for security
    - [x] Database migration and seeding automation
    - [ ] Deploy backend and frontend applications to VPS
    - [ ] Set up SSL/TLS (Let's Encrypt)
    - [ ] Configure continuous deployment (if applicable)

#### Epic 8: Internationalization
- **Task: Add Multilanguage Support**
  - **Status:** `To Do`
  - **Notes:** Implement full multi-language support across the application.
  - **Backend:**
    - [ ] Implement Laravel's built-in localization features.
    - [ ] Store all user-facing strings in language files.
  - **Frontend:**
    - [ ] Integrate `react-i18next` for managing translations.
    - [ ] Add a language selector UI component.
  - **Supported Languages:**
    - [ ] English (`en`)
    - [ ] Vietnamese (`vn`)
  - **Admin Configuration:**
    - [ ] Add an interface in the admin panel for managing and adding new language strings.

---

### Phase 6: Future Enhancements (Creative Ideas)
- **Goal:** Explore innovative features to enhance user engagement, experience, and platform capabilities beyond core functionality.

#### Epic 1: Community & Engagement
- **Task: Gamification: Badges & Leaderboards**
  - **Status:** `To Do`
  - **Notes:** Introduce a gamified system to reward users for positive contributions (e.g., successful adoptions, fostering duration, helpful comments).
  - **Backend:**
    - [ ] `Badge` and `UserBadge` models.
    - [ ] Logic for awarding badges based on actions.
    - [ ] API endpoints for user badges and leaderboards.
  - **Frontend:**
    - [ ] Display badges on user profiles.
    - [ ] Create a "Leaderboard" page.
