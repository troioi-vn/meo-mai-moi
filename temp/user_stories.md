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
-   **User Story: User Avatar Management**
    -   **Scenario:** A user uploads a new avatar on their profile page.
    -   **Backend:** Implement an endpoint to handle avatar image uploads, storing the file path in the `User` model.
    -   **Frontend:** Add an upload button and display the user's avatar on the `ProfilePage`.

#### Epic 2: Cat Profile & Custodianship Lifecycle

#### Epic 3: Cat Profile Management
-   **User Story: Create and Edit a Cat Profile**
    -   **Scenario:** A `CAT_OWNER` creates a new profile for their cat, providing all necessary details. They can later edit this information.
    -   **Backend:**
        -   Implement `CatController` with CRUD endpoints (`/api/cats`).
        -   Replace the `birthday` field with `birth_year`, `birth_month`, and `birth_day` fields in the `cats` table and model to allow for partial or unknown dates.
        -   Add a `status` field to the `cats` table to track availability (e.g., `available`, `fostered`, `adopted`). **(Done)**
        -   Implement authorization to ensure only the owner or an `ADMIN` can edit/delete the cat.
        -   Add API documentation for the new endpoints.
    -   **Frontend:**
        -   Create a "My Cats" page (`/account/cats`) to display a list of cats owned by the user.
        -   Create a form (`/account/cats/create`, `/account/cats/{id}/edit`) for creating and editing cat profiles.
        -   The form should allow the user to enter a full date, just a year and month, just a year, or no date.
        -   Calculate and display the cat's approximate age on the `CatCard` and `CatProfilePage` based on the available birthday information.
        -   Write tests for the new components.
-   **User Story: Delete a Cat Profile**
    -   **Scenario:** A `CAT_OWNER` deletes one of their cat's profiles.
    -   **Backend:** Implement a `DELETE /api/cats/{id}` endpoint with authorization. **(Done)**
    -   **Frontend:** Add a delete button to the cat management interface with a confirmation dialog.
-   **User Story: Manage Cat Profile Photos**
    -   **Scenario:** A `CAT_OWNER` uploads a new photo for their cat or removes an existing one.
    -   **Backend:** Implement endpoints to handle photo uploads and deletion. **(Done)**
    -   **Frontend:** Add UI controls on the cat edit page for photo management.

#### Epic 4: Grab This Cat Feature

This outlines the development plan for the "Grab this cat" feature, which allows users to initiate a transfer request for a cat. The feature integrates with the existing notification system to ensure users are informed of request status changes.

##### Overview

The "Grab this cat" feature enables logged-in users with the `HELPER` role to request fostering or permanent adoption of a cat. The process involves creating a `TransferRequest` with a `pending` status, which the cat owner must approve or reject. Notifications are sent to both parties upon request creation and status updates using the existing `NotificationController` and `NotificationBell` components.

##### Requirements

- Only users with the `HELPER` role can initiate a transfer request.
- The cat must have a `status` of `available`.
- The user can select between fostering (free or paid) or permanent adoption.
- For paid fostering, the price is displayed but non-negotiable.
- Notifications are sent to the cat owner when a request is made and to the helper when the request is approved or rejected.

##### Development Plan

###### Backend

1. **Update `Cat` Model**
   - Ensure the `Cat` model includes:
     - `status` (enum: `available`, `fostered`, `adopted`) **(Done)**
     - *Clarification: `fostering_type` and `price` are part of `TransferRequest`, not `Cat` model.*

2. **Transfer Request Endpoint**
   - **Route:** `POST /api/transfer-requests` **(Done)**
   - **Payload:**
     - `cat_id` (required)
     - `request_type` (enum: `fostering`, `permanent_home`)
     - `fostering_type` (enum: `free`, `paid`, if `request_type` is `fostering`)
   - **Logic:**
     - Authenticate and ensure the user has the `HELPER` role using `Auth::id()`. **(Done)**
     - Validate that the cat is `available`. **(Done)**
     - Create a `TransferRequest` with `status = pending`. **(Done)**
     - Send a notification to the cat owner via the `Notification` model. **(Done)**

3. **Notification Integration**
   - Utilize `NotificationController.php`:
     - When a transfer request is created, create a `Notification` for the cat owner with a message and link. **(Done)**
     - When a request is approved or rejected, create a `Notification` for the helper. **(Done)**
   - Notifications are fetched via `GET /notifications` and marked as read via `POST /notifications/mark-as-read`. **(Done)**

###### Frontend

1. **Cats Available Page**
   - Display filters for fostering type and permanent home.
   - Render cat cards with "Grab this cat" buttons.

2. **Grab This Cat Modal**
   - Allow selection of request type (fostering or permanent home).
   - For fostering, select free or paid (if applicable).
   - Submit the request to `POST /api/transfer-requests`.

3. **Cat Profile Page**
   - Include a "Grab this cat" button if the cat is available.

4. **Notification UI**
   - Use the existing `NotificationBell.tsx` component to display notifications.
   - Updates automatically when new notifications are fetched or marked as read.

##### Implementation Details

###### Backend

- **Transfer Request Creation**
  - Use a controller (e.g., `TransferRequestController`) to handle the request creation.
  - Validate user role and cat status.
  - Example:
    ```php
    $request = TransferRequest::create([
        'cat_id' => $request->cat_id,
        'user_id' => Auth::id(),
        'request_type' => $request->request_type,
        'fostering_type' => $request->fostering_type ?? null,
        'status' => 'pending',
    ]);
    Notification::create([
        'user_id' => $cat->owner_id,
        'message' => 'New transfer request for your cat.',
        'link' => '/transfer-requests/' . $request->id,
        'is_read' => false,
    ]);
    ```

- **Notification Logic**
  - Leverage `NotificationController::index()` to fetch notifications for the authenticated user.
  - Use `NotificationController::markAsRead()` to update `is_read` status.

###### Frontend

- **Modal Component**
  - Use shadcn/ui components for the modal and form.
  - Example submission:
    ```typescript
    const handleSubmit = async () => {
      await api.post('/api/transfer-requests', { cat_id, request_type, fostering_type });
    };
    ```

- **Notification Bell**
  - The `NotificationBell.tsx` component fetches notifications via `api.get('/notifications')` and updates the unread count.
  - Marks notifications as read on dropdown open with `api.post('/notifications/mark-as-read')`.

##### Testing

- **Backend**
  - Write Pest tests for the transfer request endpoint.
  - Test role-based access, cat status validation, and notification creation.

- **Frontend**
  - Write Vitest tests for the modal, page components, and `NotificationBell`.
  - Mock API calls to test request creation and notification updates.

##### Next Steps

1. Implement the backend logic and endpoints. **(Done)**
2. Develop the frontend components and integrate with the API.
3. Test the feature thoroughly.
4. Update the `CHANGELOG.md` with the new feature details. **(Done)**

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
