## Development Roadmap (DRAFT - PlacementRequest Architecture)

This document outlines the strategic development plan for the Meo Mai Moi project. For a history of the original user stories, see `tmp/user_stories.md`.

**MAJOR ARCHITECTURAL CHANGE:** This roadmap incorporates the new PlacementRequest model architecture, which separates cat life status from placement needs, providing a more logical and scalable system.

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
- **Task: Add Global Settings to Admin Panel (SMTP)**
  - **Status:** `To Do`
  - **Notes:** Implement a global settings page in the Filament admin panel, starting with SMTP mail server configuration for notifications.
  - **Backend:**
    - [ ] Create a Filament page or resource for global settings.
    - [ ] Implement fields for SMTP host, port, username, password, encryption, and sender email.
    - [ ] Securely store and retrieve SMTP credentials.
- **Task: Add Cats to Admin Panel**
  - **Status:** `Done`
  - **Notes:** Filament CatResource implemented. Admins can now manage cat profiles (CRUD) with new status enum (`active`, `lost`, `deceased`, `deleted`).
  - **Backend:**
    - [x] Create Filament Resource for Cat model.
    - [x] Implement CRUD operations for cats.
    - [x] Add necessary fields for cat attributes (e.g., name, breed, birthday, status).
    - [x] Use new CatStatus enum for status field.
  - **Frontend:**
    - [x] Ensure admin panel UI for cats is intuitive and user-friendly.

- **Task: Add PlacementRequests to Admin Panel**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Enable admin oversight and management of placement requests through Filament admin panel.
  - **Backend:**
    - [ ] Create Filament Resource for PlacementRequest model
    - [ ] Implement read-only views for placement request monitoring
    - [ ] Add admin-only actions (cancel requests, mark as urgent, etc.)
    - [ ] Create analytics widgets for placement request statistics
  - **Frontend:**
    - [ ] Ensure placement request admin UI shows key metrics and trends
    - [ ] Add filtering and search capabilities for placement requests
    - [ ] Create admin dashboard widgets for placement insights

---

### Phase 2: Core Functionality - Placement System & User Management
- **Goal:** Build upon the MVP by implementing the core workflows of the application, including the helper application process and the NEW placement request system for cat rehoming.

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

- **Task: Helper Profile Placement Preferences**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Allow helpers to specify their placement type preferences (foster/permanent, requirements, etc.) for better matching.
  - **Backend:**
    - [ ] Add placement preference fields to HelperProfile model (can_foster_short_term, can_foster_long_term, can_adopt_permanent, medical_care_capable, etc.)
    - [ ] Update HelperProfile API endpoints to include placement preferences
    - [ ] Add validation for placement preference combinations
  - **Frontend:**
    - [ ] Update helper profile creation/edit forms with placement preferences
    - [ ] Add placement preference indicators to helper profile displays
    - [ ] Create placement preference filtering for helper discovery

#### Epic 2: NEW - Placement Request System (CORE ARCHITECTURE)
- **Task: PlacementRequest Model & API**
  - **Status:** `To Do - HIGH PRIORITY`
  - **Notes:** **NEW CORE FEATURE** - Implement the PlacementRequest model that allows cat owners to create specific placement needs (foster/permanent) with requirements and timelines.
  - **Backend:**
    - [ ] Create `PlacementRequest` model with fields: type, status, start_date, end_date, description, priority, requirements
    - [ ] Define `PlacementRequest.status` enum: `open`, `pending_review`, `fulfilled`, `expired`, `cancelled`
    - [ ] Implement constraint: one active request per type per cat
    - [ ] Add business rule: When a permanent adoption request is fulfilled, automatically cancel any other active foster requests for the same cat.
    - [ ] Create API endpoints: `POST /api/cats/{cat}/placement-requests`, `GET /api/cats/{cat}/placement-requests`, `PUT /api/placement-requests/{id}`, `DELETE /api/placement-requests/{id}`
    - [ ] Add relationship: Cat hasMany PlacementRequests
    - [ ] Ensure: A cat should be publicly visible if there is an active PlacementRequest for this cat (even if it would otherwise be hidden)
    - [ ] Add API documentation for all endpoints
  - **Frontend:**
    - [ ] Create `PlacementRequestForm` component for owners to create requests
    - [ ] Create `PlacementRequestCard` component to display active requests on cat profiles
    - [ ] Add placement request management to cat owner dashboard
    - [ ] Add validation and error handling for placement requests

- **Task: NEW - Owner-Side Placement Management**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Create the interface for cat owners to manage incoming placement responses from helpers.
  - **Backend:**
    - [ ] Create API endpoint to list all `TransferRequests` for a given `PlacementRequest`.
    - [ ] Implement `accept` and `reject` actions on `TransferRequest` that can only be performed by the cat owner.
    - [ ] When a response is accepted, update the `PlacementRequest` status to `fulfilled`.
  - **Frontend:**
    - [ ] Create a "Manage Responses" view on the owner's dashboard.
    - [ ] Display a list of helpers who have responded to a placement request.
    - [ ] Add `Accept` and `Reject` buttons for each response.
    - [ ] Ensure the UI updates correctly after an action is taken.


#### Epic 3: Cat Profile Management (REFACTORED)
- **Task: Refactor Cat Status System**
  - **Status:** `Done`
  - **Notes:** **MAJOR REFACTOR COMPLETED** - Cat status now uses enum: `active`, `lost`, `deceased`, `deleted` (was: available/fostered/adopted/dead). All backend, frontend, and tests updated. Migration and data update complete. Admin panel supports new enum.
  - **Backend:**
    - [x] Create migration to update Cat.status enum: `active`, `lost`, `deceased`, `deleted`
    - [x] Update existing cats to use new status (all current cats → `active`)
    - [x] Update CatController to handle new status logic
    - [x] Remove placement-related status logic from cat filtering
    - [x] Update API documentation for new status values
  - **Frontend:**
    - [x] Update all cat status displays to use new enum
    - [x] Update cat filtering to work with new status system
    - [x] Modify `EnhancedCatRemovalModal` to use new status logic
    - [x] Update tests to reflect new status system

- **Task: Maintain Existing Cat Management Features**
  - **Status:** `Done` (needs minor updates for new status)
  - **Backend:**
    - [x] Implement `CatController` CRUD
    - [x] Add `status` field to `Cat` model (needs refactoring to new enum)
    - [ ] Implement flexible birthday fields (`year`, `month`, `day`)
    - [ ] Update API documentation
  - **Frontend:**
    - [x] Create "My Cats" page with deceased cats toggle (needs update for new status)
    - [x] Create `Create/Edit Cat` form (needs status update)
    - [ ] Calculate and display age from birthday
    - [x] Write and refactor tests for EditCatPage, including validation error handling (DONE)
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
  - **Status:** `Done` (compatible with new status)
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
  - **Status:** `Done` (needs minor updates for new status)
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

#### Epic 4: NEW - Placement Response System (Helper Interaction)
- **Task: Link TransferRequest to PlacementRequest**
  - **Status:** `To Do - HIGH PRIORITY`
  - **Notes:** **ARCHITECTURE UPDATE** - Modify existing TransferRequest system to respond to specific PlacementRequests instead of generic cat grabbing.
  - **Backend:**
    - [ ] Add `placement_request_id` foreign key to TransferRequest model
    - [ ] Update TransferRequest creation logic to link to specific PlacementRequest
    - [ ] Modify TransferRequest validation to ensure placement request is active
    - [ ] Update acceptance logic to mark PlacementRequest as fulfilled
    - [ ] Add relationship: PlacementRequest hasMany TransferRequests
  - **Frontend:**
    - [ ] Replace generic "Grab This Cat" with placement-specific "Respond to Request"
    - [ ] Create `PlacementResponseModal` showing available placement requests
    - [ ] Update TransferRequest displays to show associated placement details
    - [ ] Add placement context to notification messages

- **Task: NEW - Placement Discovery & Matching**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Allow helpers to discover cats with active placement requests and understand specific needs.
  - **Backend:**
    - [ ] Add API endpoint: `GET /api/placement-requests` with filtering (type, location, urgency)
    - [ ] Implement placement request search and sorting
    - [ ] Add statistics endpoint for placement success rates
  - **Frontend:**
    - [ ] Create `/placements` page for browsing active placement requests
    - [ ] Add filters for placement type, location, urgency, requirements
    - [ ] Create `PlacementRequestCard` for display in lists
    - [ ] Add placement request details modal
    - [ ] Integrate with existing cat profile links

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
- **Task: Enhanced Notification Types for PlacementRequests**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Enhance notification system with specific placement request notification types.
  - **Backend:**
    - [ ] Create PlacementRequestNotification model/service
    - [ ] Add notification types: request_created, request_approved, request_expired, match_found
    - [ ] Implement notification preferences per user (email, SMS, in-app)
    - [ ] Add email/SMS notification channels for placement updates
    - [ ] Create notification templates for each placement event type
  - **Frontend:**
    - [ ] Create notification preference settings in user profile
    - [ ] Display placement-specific notifications in UI with distinct styling
    - [ ] Add real-time notifications for placement matches
    - [ ] Implement notification filtering by type

- **Task: Centralized Notifications**
  - **Status:** `Planned`
  - **Backend:**
    - [ ] `Notification` model & endpoints (already exists, needs enhancement)
    - [ ] Event listener for `HelperProfile` status
    - [ ] NEW: Event listeners for PlacementRequest creation/fulfillment
  - **Frontend:**
    - [ ] `NotificationBell` component
    - [ ] Dropdown list for notifications
    - [ ] Mark as read functionality
    - [ ] NEW: Placement-specific notification types

#### Epic 6: NEW - Placement Analytics & Insights
- **Task: Placement Success Tracking**
  - **Status:** `To Do`
  - **Notes:** **NEW FEATURE** - Track placement success rates, timing, and outcomes for platform improvement.
  - **Backend:**
    - [ ] Add placement outcome tracking (successful, returned, etc.)
    - [ ] Implement analytics endpoints for success rates
    - [ ] Add timing metrics (time from request to placement)
  - **Frontend:**
    - [ ] Create analytics dashboard for admins
    - [ ] Add success rate displays for public trust building
    - [ ] Create placement history tracking for individual cats

---

### Phase 4: Advanced Features & Polish
- **Goal:** Add advanced discovery features and refine the user experience.

#### Epic 3: Public Discovery & Browsing (UPDATED)
- **Task: Enhanced Cat & Placement Filtering**
  - **Status:** `To Do`
  - **Notes:** **UPDATED** - Filter cats by placement needs rather than just availability.
  - **Backend:**
    - [ ] Enhance `GET /api/cats` with placement-based filters
    - [ ] Add filters for active placement types (foster/permanent)
    - [ ] Implement urgency and requirement-based filtering
  - **Frontend:**
    - [ ] Update cat list filters to show placement needs
    - [ ] Add placement type indicators to cat cards
    - [ ] Create placement urgency visual indicators

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
    - [ ] Fetch a list of cats with active placement requests from the `/api/cats` endpoint
    - [ ] Map the fetched data to the `CatCard` component with placement indicators
    - [ ] Ensure the layout is responsive and handles various numbers of cats gracefully
    - [ ] NEW: Highlight urgent placement needs on homepage

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
    - [ ] NEW: Update OpenAPI docs for PlacementRequest endpoints
- **Task: Deployment & CI/CD**
  - **Status:** `To Do`
  - **Backend:**
    - [ ] Set up production environment
    - [ ] Create CI/CD pipeline
    - [ ] NEW: Migration strategy for PlacementRequest rollout
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
  - **Notes:** Introduce a gamified system to reward users for positive contributions (e.g., successful placements, fostering duration, helpful comments).
  - **Backend:**
    - [ ] `Badge` and `UserBadge` models.
    - [ ] Logic for awarding badges based on placement actions.
    - [ ] API endpoints for user badges and leaderboards.
  - **Frontend:**
    - [ ] Display badges on user profiles.
    - [ ] Create a "Leaderboard" page.

#### Epic 2: NEW - Advanced Placement Features
- **Task: Smart Placement Matching**
  - **Status:** `Future Enhancement`
  - **Notes:** **FUTURE FEATURE** - AI-powered matching between cats needing placement and suitable helpers.
  - **Backend:**
    - [ ] Implement matching algorithm based on requirements, location, experience
    - [ ] Add preference learning from successful placements
    - [ ] Create compatibility scoring system
  - **Frontend:**
    - [ ] Display match scores and recommendations
    - [ ] Create "Recommended for You" sections
    - [ ] Add match explanation UI

- **Task: Placement Templates & Workflows**
  - **Status:** `Future Enhancement`
  - **Notes:** **FUTURE FEATURE** - Predefined placement workflows for common scenarios (medical foster, kitten care, etc.).
  - **Backend:**
    - [ ] Create placement template system
    - [ ] Add workflow automation for common scenarios
    - [ ] Implement placement milestone tracking
  - **Frontend:**
    - [ ] Template selection interface for placement creation
    - [ ] Workflow progress tracking UI
    - [ ] Milestone celebration and notification system

---

## Breaking Changes Summary


### Database Changes
- **`Cat` Model:** Now uses status enum: `active`, `lost`, `deceased`, `deleted` (was: available/fostered/adopted/dead). Represents the cat's permanent biological and descriptive information.
    - TODO: checkbox "unknown_birthday" (boolean, nullable): Indicates if the birth date is unknown. (`birthday` still could be saved as aproximate date for age calculation)
    - TODO: add small `~` symbol to indicate approximate dates in the UI.
    - TODO: add checkbox "is_neutered" (boolean, nullable): Indicates if the cat is neutered.
- **New table**: `placement_requests`
- **Updated**: `transfer_requests` adds `placement_request_id` foreign key

### API Changes
- **Modified**: `GET /api/cats` filtering logic (no longer filters by placement status)
- **New endpoints**: PlacementRequest CRUD operations
- **Modified**: `POST /api/transfer-requests` requires `placement_request_id`

### Frontend Changes
- **All cat status displays** need updating
- **"Grab This Cat" button** replaced with placement-specific interactions
- **New UI components** for placement request management
- **Updated cat filtering** logic throughout the application

## Frontend Test Refactoring

The following test files need to be reviewed and refactored to align with the new testing architecture outlined in `GEMINI.md`. The goal is to ensure all tests use the global MSW server, the `renderWithRouter` utility, and centralized mock data.

- Centralized Mock Data and Handlers:
Moving all mock data (like mockUser) to a shared location and using global MSW handlers ensures consistency, maintainability, and alignment with your GEMINI.md testing strategy.

- Robust UI Feedback and Navigation Testing:
For UI feedback (like toasts) and navigation, direct DOM assertions can be unreliable due to portals or router limitations. Mocking external modules (e.g., sonner for toasts, useNavigate for navigation) and asserting their calls is the most reliable and maintainable approach.

- ESM Mocking Limitations Require Module Mocks:
Vitest (and other ESM-based test runners) cannot spy on named exports directly. Instead, you must use vi.mock to mock entire modules and their methods, which is essential for testing side effects in modern React apps.