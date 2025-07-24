# Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project. The primary goal is to build a robust, community-driven platform for cat rehoming.

---

## Current Milestone: Minimum Viable Product (MVP)

The focus is on delivering the core features required for the platform to be functional and valuable. This includes full user account management, the core placement request system, and admin oversight.

### Core Functionality
- **Task: Implement Placement Request System (High Priority)**
  - **Notes:** This is the central feature of the application. It allows cat owners to create requests for foster or permanent homes.
  - **Backend:**
    - [x] Create `PlacementRequest` model and API endpoints (CRUD).
    - [x] Write unit and integration tests for PlacementRequest model and API endpoints.
    - [x] Define `PlacementRequest.status` enum: `open`, `pending_review`, `fulfilled`, `expired`, `cancelled`.
    - [x] Write tests for PlacementRequest.status enum logic.
    - [x] Implement business rule: One active placement request per type (foster/permanent) per cat.
    - [x] Write tests for business rule enforcement.
    - [x] Ensure a cat's profile is publicly visible if it has an active placement request.
    - [x] Write tests for cat profile visibility logic.
  - **Frontend:**
    - [x] Create `PlacementRequestForm` for owners.
    - [x] Write component/UI tests for PlacementRequestForm.
    - [x] Display active requests on cat profiles.
    - [x] Write tests for displaying active requests on cat profiles.
    - [x] Add placement request management to cats profile.
    - [x] Write tests for placement request management UI.
    - [x] Show active placement requests in Cat's Card
    - [x] Write tests for Cat's Card active request display.

  - **Task: Implement Placement Response System**
    - **Notes:** Allows helpers to respond to specific placement requests.
    - **Backend:**
      - [ ] Link `TransferRequest` to `PlacementRequest` with a foreign key.
      - [ ] Write tests for TransferRequest linkage.
      - [ ] Update creation/acceptance logic for `TransferRequest`.
      - [ ] Write tests for TransferRequest creation/acceptance logic.
    - **Frontend:**
      - [ ] Replace generic "Grab This Cat" button with a "Respond to Request" flow.
      - [ ] Write tests for Respond to Request flow.
      - [ ] Create a `PlacementResponseModal` for helpers.
      - [ ] Write component/UI tests for PlacementResponseModal.

- **Task: Medical Records Management**
  - **Backend:**
    - [ ] Add models and API endpoints for tracking a cat's weight and vaccination history.
    - [ ] Write tests for medical records models and endpoints.
  - **Frontend:**
    - [ ] Add UI for owners to view and update medical records (weight, vaccinations) on cat profiles.
    - [ ] Write tests for medical records UI.

- **Task: Internationalization (i18n)**
  - **Backend:**
    - [ ] Prepare API and models for multi-language support (English, Vietnamese).
    - [ ] Write tests for i18n API/model support.
  - **Frontend:**
    - [ ] Implement i18n for UI, starting with English and Vietnamese.
    - [ ] Write tests for i18n UI implementation.

### User Accounts & Profiles
- **Task: Full User Account Management**
  - **Backend:**
    - [ ] Implement password recovery via email.
    - [ ] Write tests for password recovery logic.
    - [ ] Add a "Stay Logged In" option.
    - [ ] Write tests for Stay Logged In option.
  - **Frontend:**
    - [ ] Create password recovery forms and flow.
    - [ ] Write tests for password recovery UI.
    - [ ] Add "Stay Logged In" checkbox to login page.
    - [ ] Write tests for login page Stay Logged In checkbox.

- **Task: Helper Placement Preferences**
  - **Notes:** Allow helpers to specify what kind of help they can offer (fostering, adoption, etc.).
  - **Backend:**
    - [ ] Add placement preference fields to the `HelperProfile` model.
    - [ ] Write tests for HelperProfile placement preferences.
    - [ ] Update API to include these preferences.
    - [ ] Write tests for API placement preferences.
  - **Frontend:**
    - [ ] Add preference selection to the helper profile form.
    - [ ] Write tests for helper profile preference selection UI.
    - [ ] Display preferences on public helper profiles.
    - [ ] Write tests for public helper profile preferences display.

### Cat Profile & My Cats Page
- **Task: Cat Profile Improvements**
  - **Frontend:**
    - [ ] Remove the charge status field from the Cat Profile Edit page.
    - [ ] Write tests for Cat Profile Edit page changes.
    - [ ] Add a "LOST!" button above "Delete." Set status to yes/no based on user approval.
    - [ ] Write tests for LOST button logic/UI.
    - [x] Remove back button from cat's profile page.
    - [x] Write tests for cat profile page navigation changes.
    - [ ] Make "location" and "description" fields optional.
    - [ ] Write tests for optional location/description fields.
    - [ ] Rethink birthday field: allow unknown birthdays and approximate date (year + month).
    - [ ] Write tests for birthday field logic/UI.
    - [ ] Create placeholder for paw icon and simple logo image.
    - [ ] Write tests for paw icon/logo image display.

- **Task: My Cats Page Enhancements**
  - **Frontend:**
    - [ ] Add sorting options: by name, by age, by closest vaccination expiration.
    - [ ] Write tests for sorting options logic/UI.
    - [ ] Move "Show Deceased Cats" switch next to sorting options.
    - [ ] Write tests for Show Deceased Cats switch placement/UI.

- **Task: Cat Photo Upload Bug**
  - **Frontend:**
    - [ ] Fix bug: After uploading a cat photo, "Replace" and "Remove" buttons should remain visible.
    - [ ] Write tests for cat photo upload UI bug fix.

### General & Release
- **Task: MVP Release & Deployment**
  - **Backend:**
    - [ ] Set up VPS production server.
    - [ ] Write deployment tests/scripts as needed.
    - [ ] Deploy MVP to production server.
    - [ ] Write deployment tests/scripts as needed.
  - **General:**
    - [ ] Release MVP.
    - [ ] Write release verification tests.

---

## Post-MVP Enhancements

These are features that will be developed after the MVP is complete and stable. They are grouped by theme.

### Community & Engagement
 - **Task: Fosterer Comments:** Allow users to leave comments on a cat's profile after a placement request is fulfilled and the cat is adopted or fostered.
   - [ ] Write tests for fosterer comments feature (backend & frontend).
 - **Task: Secure In-App Messaging:** A private messaging system for users to communicate securely.
   - [ ] Write tests for in-app messaging (backend & frontend).
 - **Task: Centralized Notifications:** Enhance the existing notification system with more types (e.g., for placement requests) and user preferences (email, in-app).
   - [ ] Write tests for notification system enhancements.
 - **Task: Gamification:** Introduce badges and leaderboards to reward positive community contributions.
   - [ ] Write tests for gamification features.

### Lost Cats Feature
  - **Backend:**
    - [ ] Add models and API endpoints for lost cats and public comments.
  - **Frontend:**
    - [ ] Add models and API endpoints for lost cats and public comments.
    - [ ] Write tests for lost cats models/endpoints.
    - [ ] Create Lost Cats page; allow users to comment and coordinate search operations.
    - [ ] Write tests for Lost Cats page and comment features.

### Advanced Features
 - **Task: Placement Discovery & Matching:** A dedicated page for helpers to browse and filter active placement requests.
   - [ ] Write tests for placement discovery & matching features.
 - **Task: AI-Powered Vaccination Note Recognition:** A future enhancement to automatically parse vaccination records from uploaded images.
   - [ ] Write tests for vaccination note recognition feature.
 - **Task: Smart Placement Matching:** An AI-powered system to recommend suitable helpers for placement requests.
   - [ ] Write tests for smart placement matching system.

### Notifications & Mail
- **Task: Sendmail Implementation**
  - **Backend:**
    - [ ] Support SMTP via `.env` for development.
    - [ ] Write tests for SMTP support.
    - [ ] Configure MailGun via admin page.
    - [ ] Write tests for MailGun configuration.
    - [ ] Configure MailGun account and domain.
    - [ ] Write tests for MailGun account/domain setup.

- **Task: Universal Notification System**
  - **Backend:**
    - [ ] Create a universal notification system for the notification bell feature.
    - [ ] Write tests for universal notification system.
    - [ ] Monitor birthdays and vaccination expiration dates.
    - [ ] Write tests for birthday/vaccination monitoring.
    - [ ] Create notification templates and triggers.
    - [ ] Write tests for notification templates/triggers.
    - [ ] Add model-level support for user notification preferences.
    - [ ] Write tests for user notification preferences.
  - **Frontend:**
    - [ ] Create user options page with a Notifications section (list of options, checkboxes for Email/In-App).
    - [ ] Write tests for user options/notifications UI.
    - [ ] Display notifications in-app and via email as per user preferences.
    - [ ] Write tests for notification display logic.

### UI & UX Polish
 - **Task: Display Real Cats on Homepage:** Replace static content with a dynamic list of cats needing homes.
   - [ ] Write tests for dynamic homepage cat list.


---

## Completed Milestones

This section serves as a historical record of major completed tasks.

- **Project Foundation & Setup:**
  - Established core project infrastructure, backend/frontend scaffolding, and development tools.
  - Optimized Docker setup with multi-stage builds and improved caching.
- **Core MVP (Initial Version):**
  - Implemented user registration, login, and basic profile management.
  - Created the Filament admin panel with user and role management.
  - Implemented the ability for admins to perform CRUD operations on cats.
  - Refactored the `Cat` model to use a status enum (`active`, `lost`, `deceased`, `deleted`).
  - Implemented cat profile photo management (upload, delete, resize).
  - Created the "My Cats" page for owners to manage their cats.
  - Implemented an enhanced, multi-step process for deleting cat profiles.
- **Permissions & Architecture:**
  - Implemented an ownership-based permission system for cat management.
  - Replaced the one-to-one Cat-User relationship with a flexible, many-to-many permission system.
  - Implemented API contract testing to ensure documentation and implementation stay in sync.
- **Deployment & Infrastructure:**
  - Automated database setup (migrations and seeding).
  - Deployed a live Alpha version to a VPS with Nginx and SSL.
  - Resolved numerous deployment issues related to file uploads, permissions, and routing.
