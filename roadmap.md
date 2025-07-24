# Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project. The primary goal is to build a robust, community-driven platform for cat rehoming.

---

## Current Milestone: Minimum Viable Product (MVP)

The focus is on delivering the core features required for the platform to be functional and valuable. This includes full user account management, the core placement request system, and admin oversight.

### Core Functionality
- **Task: Implement Placement Request System (High Priority)**
  - **Notes:** This is the central feature of the application. It allows cat owners to create requests for foster or permanent homes.
  - **Backend:**
    - [ ] Create `PlacementRequest` model and API endpoints (CRUD).
    - [ ] Define `PlacementRequest.status` enum: `open`, `pending_review`, `fulfilled`, `expired`, `cancelled`.
    - [ ] Implement business rule: One active placement request per type (foster/permanent) per cat.
    - [ ] Ensure a cat is publicly visible if it has an active placement request.
  - **Frontend:**
    - [ ] Create `PlacementRequestForm` for owners.
    - [ ] Display active requests on cat profiles.
    - [ ] Add placement request management to the owner's dashboard.

- **Task: Implement Placement Response System**
  - **Notes:** Allows helpers to respond to specific placement requests.
  - **Backend:**
    - [ ] Link `TransferRequest` to `PlacementRequest` with a foreign key.
    - [ ] Update creation/acceptance logic for `TransferRequest`.
  - **Frontend:**
    - [ ] Replace generic "Grab This Cat" button with a "Respond to Request" flow.
    - [ ] Create a `PlacementResponseModal` for helpers.

- **Task: Medical Records Management**
  - **Backend:**
    - [ ] Add models and API endpoints for tracking a cat's weight and vaccination history.
  - **Frontend:**
    - [ ] Add UI for owners to view and update medical records (weight, vaccinations) on cat profiles.

- **Task: Internationalization (i18n)**
  - **Backend:**
    - [ ] Prepare API and models for multi-language support (English, Vietnamese).
  - **Frontend:**
    - [ ] Implement i18n for UI, starting with English and Vietnamese.

### User Accounts & Profiles
- **Task: Full User Account Management**
  - **Backend:**
    - [ ] Implement password recovery via email.
    - [ ] Add a "Stay Logged In" option.
  - **Frontend:**
    - [ ] Create password recovery forms and flow.
    - [ ] Add "Stay Logged In" checkbox to login page.

- **Task: Helper Placement Preferences**
  - **Notes:** Allow helpers to specify what kind of help they can offer (fostering, adoption, etc.).
  - **Backend:**
    - [ ] Add placement preference fields to the `HelperProfile` model.
    - [ ] Update API to include these preferences.
  - **Frontend:**
    - [ ] Add preference selection to the helper profile form.
    - [ ] Display preferences on public helper profiles.

### Cat Profile & My Cats Page
- **Task: Cat Profile Improvements**
  - **Frontend:**
    - [ ] Remove the charge status field from the Cat Profile Edit page.
    - [ ] Add a "LOST!" button above "Delete." Set status to yes/no based on user approval.
    - [ ] Remove back button from cat's profile page.
    - [ ] Make "location" and "description" fields optional.
    - [ ] Rethink birthday field: allow unknown birthdays and approximate date (year + month).
    - [ ] Create placeholder for paw icon and simple logo image.

- **Task: My Cats Page Enhancements**
  - **Frontend:**
    - [ ] Add sorting options: by name, by age, by closest vaccination expiration.
    - [ ] Move "Show Deceased Cats" switch next to sorting options.

- **Task: Cat Photo Upload Bug**
  - **Frontend:**
    - [ ] Fix bug: After uploading a cat photo, "Replace" and "Remove" buttons should remain visible.

### General & Release
- **Task: MVP Release & Deployment**
  - **Backend:**
    - [ ] Set up VPS production server.
    - [ ] Deploy MVP to production server.
  - **General:**
    - [ ] Release MVP.

---

## Post-MVP Enhancements

These are features that will be developed after the MVP is complete and stable. They are grouped by theme.

### Community & Engagement
- **Task: Fosterer Comments:** Allow users to leave comments on a cat's profile after a placement request is fulfilled and the cat is adopted or fostered.
- **Task: Secure In-App Messaging:** A private messaging system for users to communicate securely.
- **Task: Centralized Notifications:** Enhance the existing notification system with more types (e.g., for placement requests) and user preferences (email, in-app).
- **Task: Gamification:** Introduce badges and leaderboards to reward positive community contributions.

### Lost Cats Feature
- **Task: Lost Cats Page & Feature**
  - **Backend:**
    - [ ] Add models and API endpoints for lost cats and public comments.
  - **Frontend:**
    - [ ] Create Lost Cats page; allow users to comment and coordinate search operations.

### Advanced Features
- **Task: Placement Discovery & Matching:** A dedicated page for helpers to browse and filter active placement requests.
- **Task: AI-Powered Vaccination Note Recognition:** A future enhancement to automatically parse vaccination records from uploaded images.
- **Task: Smart Placement Matching:** An AI-powered system to recommend suitable helpers for placement requests.

### Notifications & Mail
- **Task: Sendmail Implementation**
  - **Backend:**
    - [ ] Support SMTP via `.env` for development.
    - [ ] Configure MailGun via admin page.
    - [ ] Configure MailGun account and domain.

- **Task: Universal Notification System**
  - **Backend:**
    - [ ] Create a universal notification system for the notification bell feature.
    - [ ] Monitor birthdays and vaccination expiration dates.
    - [ ] Create notification templates and triggers.
    - [ ] Add model-level support for user notification preferences.
  - **Frontend:**
    - [ ] Create user options page with a Notifications section (list of options, checkboxes for Email/In-App).
    - [ ] Display notifications in-app and via email as per user preferences.

### UI & UX Polish
- **Task: Display Real Cats on Homepage:** Replace static content with a dynamic list of cats needing homes.


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
