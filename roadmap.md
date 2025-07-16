## Development Roadmap

This document outlines the strategic development plan for the Meo Mai Moi project. For a history of the original user stories, see `tmp/user_stories.md`.

---

### Phase 0: Project Foundation & Setup
- **Status:** `Done`
- **Goal:** Establish the core project infrastructure, including backend and frontend scaffolding, development tools, and documentation setup.

---

### Phase 1: Core MVP - Viewing & User Management
- **Status:** `Done`
- **Goal:** Implement the minimum viable product (MVP) functionality. This includes user registration, basic profile management, the ability for admins to add cats, and for the public to view them.

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
    - [x] Add `status` field to `Cat` model
    - [ ] Implement flexible birthday fields (`year`, `month`, `day`)
    - [ ] Add API documentation
  - **Frontend:**
    - [ ] Create "My Cats" page
    - [x] Create `Create/Edit Cat` form
    - [ ] Calculate and display age from birthday
    - [x] Write tests for new components
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