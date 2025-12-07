# Rehoming Flow: From Match to Handover (and Return)

This document outlines the lifecycle after a placement request receives a matched response, covering both permanent placement and fostering.

## Placement Request Status Flow

The placement request goes through the following status transitions:

1. **`open`** - Initial state when Owner creates the Placement Request
2. **`fulfilled`** - Owner selected the Helper and clicks "Accept" button to accept Helper's response
3. **`pending_transfer`** - Helper clicks "Confirm Rehoming" button to confirm the transfer
4. **`finalized`** (permanent) OR **`active`** (temporary) - After handover completion:
   - **Permanent rehoming**: Pet's `user_id` is changed to helper's `user_id` and status set to `finalized`
   - **Temporary fostering**: Status set to `active` (pet remains under Owner's account)
5. **`finalized`** (temporary only) - Owner clicks "Pet is Returned" button to finalize temporary fostering

## 1) Accept a Transfer Response (Owner)
- Endpoint: POST /api/transfer-requests/{transferRequest}/accept
- Effects:
  - Marks the transfer request as accepted (accepted_at set)
  - Sets PlacementRequest status to `fulfilled`
  - Auto-rejects all other pending responses for that PlacementRequest
  - Creates an initial TransferHandover record (status=pending)
  - Frontend shows "Confirm Rehoming" button to the accepted Helper on public pet profile

## 2) Confirm Rehoming (Helper)
- Action: Helper clicks "Confirm Rehoming" button on public pet profile page
- Endpoint: POST /api/transfer-handovers/{handover}/complete
- Effects:
  - Sets PlacementRequest status to `pending_transfer`
  - Completes the handover (status=completed)
  - For permanent placement: changes Pet.user_id (ownership) to the helper; updates OwnershipHistory (close previous owner record and open new one). Sets PlacementRequest status to `finalized`
  - For foster placement: creates or ensures an active FosterAssignment. Sets PlacementRequest status to `active`

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
    - Permanent placement: change Pet.user_id (ownership) to the helper; update OwnershipHistory (close previous owner record and open new one). If no open period exists for the previous owner, the system backfills and closes it. Sets PlacementRequest status to `finalized`
    - Foster placement: create or ensure an active FosterAssignment (owner_user_id = original owner, foster_user_id = helper, expected_end_date = placement.end_date when set). Sets PlacementRequest status to `active`

## 4) Finalize Temporary Fostering (Owner)
- Action: Owner clicks "Pet is Returned" button on pet profile page
- Endpoint: POST /api/placement-requests/{placementRequest}/finalize
- Requirements:
  - Only works for placement requests with `active` status
  - Only works for fostering types (foster_free or foster_payed)
  - Only the pet owner can call this endpoint
- Effects:
  - Sets PlacementRequest status to `finalized`
  - Ends any active FosterAssignment (sets status=completed, actual_end_date=now)
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
    - Marks the FosterAssignment as completed (completed_at set, status=completed).

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
- **FosterAssignment**: records an active fostering window, references transfer_request_id
- **FosterReturnHandover**: id, foster_assignment_id, owner_user_id, foster_user_id, scheduled_at?, location?, status, condition flags, timestamps (planned)
- **OwnershipHistory**: (pet_id, user_id, from_ts, to_ts?) tracks permanent ownership changes
  - Initial open record is created on pet creation; for legacy data use: `php artisan ownership-history:backfill` (add `--dry-run` to preview)

## Client UX (Frontend) – Current Implementation

### Helper View (Public Pet Profile)
- After owner accepts a response, Helper sees "Confirm Rehoming" button on the public pet profile page
- Button appears when PlacementRequest status is `fulfilled` and Helper has an accepted transfer request
- Clicking the button completes the handover and transitions status appropriately
- Status badges show current placement request state

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

## Future Enhancements
- Rescheduling, messaging, and file upload (agreements) attached to handovers
- Reminders around expected_end_date and missed confirmations
- Post-completion redirects/UX polish for permanent and foster flows
- Full return handover procedure with scheduling and condition confirmation
- Optional: Cancel flow for FosterReturnHandover mirroring transfer handover cancel
