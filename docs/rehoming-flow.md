# Rehoming Flow: From Match to Handover (and Return)

This document outlines the lifecycle after a placement request receives a matched response, covering both permanent placement and fostering.

## 1) Accept a Transfer Response (Owner)
- Endpoint: POST /api/transfer-requests/{transferRequest}/accept
- Effects:
  - Marks the transfer request as accepted (accepted_at set).
  - Fulfills and deactivates the associated PlacementRequest.
  - Auto-rejects all other pending responses for that PlacementRequest.
  - Creates an initial TransferHandover record (status=pending).

## 2) Schedule & Complete the Physical Handover
- Create/Schedule (Owner):
  - POST /api/transfer-requests/{transferRequest}/handover
  - Body: scheduled_at?, location?
  - Result: TransferHandover created (status=pending).
- Helper confirms condition (Helper):
  - POST /api/transfer-handovers/{handover}/confirm
  - Body: condition_confirmed: boolean, condition_notes?
  - Sets status=confirmed or disputed.
- Complete handover (Either party):
  - POST /api/transfer-handovers/{handover}/complete
  - Effects:
    - status=completed on the handover
    - Permanent placement: change Cat.user_id (ownership) to the helper; update OwnershipHistory (close previous owner record and open new one).
    - Foster placement: create or ensure an active FosterAssignment (owner_user_id = original owner, foster_user_id = helper, expected_end_date = placement.end_date when set).

Notifications are sent at key milestones (handover scheduled, helper confirmed, handover completed).

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

Notifications are sent when a return is scheduled, confirmed, and completed.

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
- After owner accepts a response, show a banner to "Schedule handover" with date/time and location.
- Helper sees the pending handover in their account with a "Confirm condition" step.
- On completion, for permanent transfers, redirect helper to "You are now the owner" page; for foster, show "Foster period started" with expected end date.
- For fostering, near expected end date, prompt fosterer to schedule a return. Provide status chips and actions mirroring the APIs above.

## Future Enhancements
- Cancel/dispute flows for both handovers.
- Rescheduling, messaging, and file upload (agreements) attached to handovers.
- Reminders around expected_end_date and missed confirmations.
