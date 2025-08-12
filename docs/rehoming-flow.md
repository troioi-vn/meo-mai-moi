# Rehoming Flow: From Match to Handover (and Return)

This document outlines the lifecycle after a placement request receives a matched response, covering both permanent placement and fostering.

## 1) Accept a Transfer Response (Owner)
- Endpoint: POST /api/transfer-requests/{transferRequest}/accept
- Effects:
  - Marks the transfer request as accepted (accepted_at set).
  - Fulfills and deactivates the associated PlacementRequest.
  - Auto-rejects all other pending responses for that PlacementRequest.
  - Creates an initial TransferHandover record (status=pending).
  - Frontend hides the Placement Request block once it is no longer active/open.

## 2) Schedule & Complete the Physical Handover
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
    - Permanent placement: change Cat.user_id (ownership) to the helper; update OwnershipHistory (close previous owner record and open new one).
    - Foster placement: create or ensure an active FosterAssignment (owner_user_id = original owner, foster_user_id = helper, expected_end_date = placement.end_date when set).


## 3) Foster Return Procedure (only for fostering)
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

## Permissions
- Accept/Reject transfer: cat owner (recipient).
- Handover scheduling: owner (transfer recipient).
- Handover confirm: helper.
- Handover complete: owner or helper.
- Return scheduling: fosterer.
- Return confirm: owner.
- Return complete: owner or fosterer.

## Data Models
- TransferRequest: requested_relationship_type ∈ {permanent_foster, fostering}
- TransferHandover: id, transfer_request_id, owner_user_id, helper_user_id, scheduled_at?, location?, status (pending|confirmed|completed|canceled|disputed), timestamps including condition flags.
- FosterAssignment: records an active fostering window, references transfer_request_id.
- FosterReturnHandover: id, foster_assignment_id, owner_user_id, foster_user_id, scheduled_at?, location?, status, condition flags, timestamps.
- OwnershipHistory: (cat_id, user_id, from_ts, to_ts?) tracks permanent ownership changes.

## Client UX (Frontend) – Suggested
- After the owner accepts a response, the UI auto-opens a scheduling modal and shows a "Schedule handover" button in the Accepted section. The button is hidden once a handover exists for that transfer.
- Helper sees a pending handover panel with "Confirm" and "Dispute" actions. Both owner and helper see a meeting banner (pending/confirmed) with "Cancel" and "Mark as completed" actions.
- Accepted responses display a small status chip that reflects the latest fetched handover status (pending/confirmed/disputed/canceled/completed) with meeting details inline (scheduled_at, location).
- On completion:
  - Permanent: redirect helper to a "You are now the owner" experience (planned).
  - Foster: show a "Foster period started" message with expected end date (planned).
- For fostering, near expected_end_date, prompt the fosterer to schedule a return. Provide status chips and actions mirroring the APIs above.

## Future Enhancements
- Rescheduling, messaging, and file upload (agreements) attached to handovers.
- Reminders around expected_end_date and missed confirmations.
- Post-completion redirects/UX polish for permanent and foster flows.
- Optional: Cancel flow for FosterReturnHandover mirroring transfer handover cancel.
