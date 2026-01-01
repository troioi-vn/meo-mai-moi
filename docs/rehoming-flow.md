# Rehoming Flow: From Match to Handover (and Return)

This document outlines the lifecycle after a placement request receives a matched response, covering both permanent placement and fostering.

## Placement Request Status Flow

The placement request goes through the following status transitions:

1. **`open`** - Initial state when Owner creates the Placement Request
2. **`fulfilled`** - Owner selected the Helper and clicks "Accept" button to accept Helper's response
3. **`pending_transfer`** - Helper clicks "Confirm Rehoming" button to confirm the transfer
4. **`finalized`** (permanent) OR **`active`** (temporary) - After handover completion:
   - **Permanent rehoming**: Pet's `user_id` is changed to helper's `user_id` and status set to `finalized`
   - **Temporary fostering** (`foster_free` / `foster_payed`): Status set to `active`, pet ownership stays with the original Owner (helper access comes via Foster Assignment)
5. **`finalized`** (temporary only) - Owner clicks "Pet is Returned" button to finalize temporary fostering

## 1) Accept a Transfer Response (Owner)

- Endpoint: POST /api/transfer-requests/{transferRequest}/accept
- Effects:
  - Marks the transfer request as accepted (accepted_at set)
  - Sets PlacementRequest status to `fulfilled`
  - Creates an initial TransferHandover record (status=pending)
  - Frontend shows "Confirm Rehoming" button to the accepted Helper on public pet profile
  - Note: Other pending responses remain pending at this stage (not rejected yet)

## 2) Confirm Rehoming (Helper)

- Action: Helper clicks "Confirm Rehoming" button on public pet profile page
- Endpoint: POST /api/transfer-handovers/{handover}/complete
- Effects (relationship type is determined by `placement_request.request_type`; transfer request is only a fallback):
  - Sets PlacementRequest status to `pending_transfer`
  - Completes the handover (status=completed)
  - For permanent placement (`request_type = permanent`): creates new owner relationship for helper, ends previous owner relationship; updates PetRelationships. Sets PlacementRequest status to `finalized`
  - For foster placement (`request_type = foster_free` or `foster_payed`): keeps original owner relationship, creates foster relationship for helper. Sets PlacementRequest status to `active`
  - **Auto-rejects all other pending responses for that PlacementRequest** (moved from accept to here)

## 3) Schedule & Complete the Physical Handover

- Create/Schedule (Owner):
  - POST /api/transfer-requests/{transferRequest}/handover
  - Body: scheduled_at?, location?
  - Result: TransferHandover created (status=pending).
- Fetch latest handover (Owner or Helper):
  - GET /api/transfer-requests/{transferRequest}/handover
  - Returns the most recent TransferHandover for the transfer (authorized for owner/helper).
- Helper confirms condition (Helper):
  - POST /api/transfer-handovers/{handover}/confirm
  - Body: condition_confirmed: boolean, condition_notes?
  - Sets status=confirmed or disputed.
- Cancel handover (Owner or Helper):
  - POST /api/transfer-handovers/{handover}/cancel
  - Valid when status ∈ {pending, confirmed, disputed}. Sets status=canceled.
- Complete handover (Either party):
  - POST /api/transfer-handovers/{handover}/complete
  - Effects:
    - status=completed on the handover
    - Sets PlacementRequest status to `pending_transfer`
    - Permanent placement: creates new owner relationship for helper, ends previous owner relationship; updates PetRelationships. Sets PlacementRequest status to `finalized`
    - Foster placement: creates foster relationship for helper (owner_user_id = original owner, foster_user_id = helper, expected_end_date = placement.end_date when set). Sets PlacementRequest status to `active`

## 4) Finalize Temporary Fostering (Owner)

- Action: Owner clicks "Pet is Returned" button on pet profile page
- Endpoint: POST /api/placement-requests/{placementRequest}/finalize
- Requirements:
  - Only works for placement requests with `active` status
  - Only works for fostering types (foster_free or foster_payed)
  - Only the pet owner can call this endpoint
- Effects:
  - Sets PlacementRequest status to `finalized`
  - Ends the foster relationship (sets end_date on PetRelationship)
  - Notifies helper that fostering has ended

## 5) Foster Return Procedure (Legacy - Planned)

When fostering ends, the fosterer initiates the return to the original owner.

- Initiate return (Fosterer):
  - POST /api/foster-assignments/{assignment}/return-handover
  - Body: scheduled_at?, location?
  - Creates FosterReturnHandover (status=pending).
- Owner confirms return conditions (Owner):
  - POST /api/foster-return-handovers/{handover}/confirm
  - Body: condition_confirmed: boolean, condition_notes?
  - Sets status=confirmed or disputed.
- Complete return (Either party):
  - POST /api/foster-return-handovers/{handover}/complete
  - Effects:
    - status=completed on return handover
    - Ends the foster relationship (sets end_date on PetRelationship).

**Note**: The current implementation uses the simpler "Pet is Returned" flow (section 4) instead of the full return handover procedure. The return handover procedure is planned for future implementation.

## Permissions

- Accept/Reject transfer: pet owner (recipient)
- Confirm Rehoming: helper (initiator of accepted transfer request)
- Handover scheduling: owner (transfer recipient)
- Handover confirm: helper
- Handover complete: owner or helper
- Finalize placement (Pet is Returned): owner (only for active fostering)
- Return scheduling: fosterer (planned)
- Return confirm: owner (planned)
- Return complete: owner or fosterer (planned)

## Data Models

- **PlacementRequest**: status ∈ {open, fulfilled, pending_transfer, active, finalized, expired, cancelled}
- **TransferRequest**: requested_relationship_type ∈ {permanent_foster, fostering}
- **TransferHandover**: id, transfer_request_id, owner_user_id, helper_user_id, scheduled_at?, location?, status (pending|confirmed|completed|canceled|disputed), timestamps including condition flags
- **PetRelationship**: tracks all relationships between pets and users (owner/foster/editor/viewer) with start/end dates
  - relationship_type ∈ {owner, foster, editor, viewer}
  - start_date, end_date (nullable), created_by tracks relationship lifecycle
- **FosterReturnHandover**: id, foster_assignment_id, owner_user_id, foster_user_id, scheduled_at?, location?, status, condition flags, timestamps (planned)

## Client UX (Frontend) – Current Implementation

### Helper View (Public Pet Profile)

- After owner accepts a response, Helper sees "Confirm Rehoming" button on the public pet profile page
- Button appears when PlacementRequest status is `fulfilled` and Helper has an accepted transfer request
- Clicking the button completes the handover and transitions status appropriately
- Status badges show current placement request state
- Acceptance notifications now deep-link helpers to `/pets/:id/public` so they can go straight to the confirm handover button

### Owner View (Pet Profile Page)

- Placement requests show status badges indicating current state
- For `active` temporary fostering, Owner sees:
  - Green indicator: "Pet is currently with foster"
  - "Pet is Returned" button to finalize the fostering period
- For `finalized` status, shows completion indicator
- Response count and expiration dates shown for `open` requests

### Status Indicators

- Status badges throughout the UI show:
  - **Open**: Default badge
  - **Awaiting Helper Confirmation**: Secondary badge (fulfilled)
  - **Transfer in Progress**: Secondary badge (pending_transfer)
  - **Active Fostering**: Success badge (active)
  - **Completed**: Success badge (finalized)

### Requests Page (Listing)

- Pets with placement requests remain visible while statuses are in-progress (`fulfilled`, `pending_transfer`, `active`, `finalized`) so accepted helpers can still access them and continue the flow.

## Future Enhancements

- Rescheduling, messaging, and file upload (agreements) attached to handovers
- Reminders around expected_end_date and missed confirmations
- Post-completion redirects/UX polish for permanent and foster flows
- Full return handover procedure with scheduling and condition confirmation
- Optional: Cancel flow for FosterReturnHandover mirroring transfer handover cancel
