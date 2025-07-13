# Grab This Cat Feature Implementation

This document outlines the development plan for the "Grab this cat" feature, which allows users to initiate a transfer request for a cat. The feature integrates with the existing notification system to ensure users are informed of request status changes.

## Overview

The "Grab this cat" feature enables logged-in users with the `HELPER` role to request fostering or permanent adoption of a cat. The process involves creating a `TransferRequest` with a `pending` status, which the cat owner must approve or reject. Notifications are sent to both parties upon request creation and status updates using the existing `NotificationController` and `NotificationBell` components.

## Requirements

- Only users with the `HELPER` role can initiate a transfer request.
- The cat must have a `status` of `available`.
- The user can select between fostering (free or paid) or permanent adoption.
- For paid fostering, the price is displayed but non-negotiable.
- Notifications are sent to the cat owner when a request is made and to the helper when the request is approved or rejected.

## Development Plan

### Backend

1. **Update `Cat` Model**
   - Ensure the `Cat` model includes:
     - `fostering_type` (enum: `free`, `paid`, `none`)
     - `price` (decimal, nullable)
     - `permanent_home_available` (boolean)
     - `status` (enum: `available`, `fostered`, `adopted`)

2. **Transfer Request Endpoint**
   - **Route:** `POST /api/transfer-requests`
   - **Payload:**
     - `cat_id` (required)
     - `request_type` (enum: `fostering`, `permanent_home`)
     - `fostering_type` (enum: `free`, `paid`, if `request_type` is `fostering`)
   - **Logic:**
     - Authenticate and ensure the user has the `HELPER` role using `Auth::id()`.
     - Validate that the cat is `available`.
     - Create a `TransferRequest` with `status = pending`.
     - Send a notification to the cat owner via the `Notification` model.

3. **Notification Integration**
   - Utilize `NotificationController.php`:
     - When a transfer request is created, create a `Notification` for the cat owner with a message and link.
     - When a request is approved or rejected, create a `Notification` for the helper.
   - Notifications are fetched via `GET /notifications` and marked as read via `POST /notifications/mark-as-read`.

### Frontend

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

## Implementation Details

### Backend

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

### Frontend

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

## Testing

- **Backend**
  - Write Pest tests for the transfer request endpoint.
  - Test role-based access, cat status validation, and notification creation.

- **Frontend**
  - Write Vitest tests for the modal, page components, and `NotificationBell`.
  - Mock API calls to test request creation and notification updates.

## Next Steps

1. Implement the backend logic and endpoints.
2. Develop the frontend components and integrate with the API.
3. Test the feature thoroughly.
4. Update the `CHANGELOG.md` with the new feature details.