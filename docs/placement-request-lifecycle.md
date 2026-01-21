# Placement Request Lifecycle

This document describes the end-to-end lifecycle of a placement request: creation, helper responses, (optional) physical handover via TransferRequest, and (for temporary fostering) return/finalization.

Terminology:

- **Owner**: the user who owns the pet and creates the placement request.
- **Helper**: the user who responds to the placement request and may receive the pet.

Core models:

- **PlacementRequest**: the owner’s request and overall state.
- **PlacementRequestResponse**: a helper’s response to a placement request.
- **TransferRequest**: the physical handover confirmation object (created only for types that require handover).
- **PetRelationship**: the source of truth for ownership/foster access over time.

## Status + Type Overview

Placement request statuses (as used by the current API flow):

- `open`: visible to helpers.
- `pending_transfer`: owner accepted a response and the flow is waiting for physical handover confirmation.
- `active`: temporary placement is currently in effect (foster\_\* and pet_sitting).
- `finalized`: permanent placement completed, or temporary fostering ended.

Notes:

- `fulfilled` exists as an enum value but is not used by the current API flow.
- `pet_sitting` is intentionally a special case: acceptance moves the request to `active` immediately and **does not** create a TransferRequest.

Placement request types:

- `permanent`
- `foster_free`
- `foster_paid`
- `pet_sitting`

## Lifecycle Summary

1. Owner creates a placement request (`open`).
2. Helpers respond (`responded`).
3. Owner accepts one response:
   - `pet_sitting` → request becomes `active` immediately; other responses auto-rejected; no TransferRequest.
   - `permanent` / `foster_*` → request becomes `pending_transfer`; a TransferRequest is created (`pending`).
4. Helper confirms physical handover (TransferRequest confirm):
   - `permanent` → ownership transfers via PetRelationship; request becomes `finalized`.
   - `foster_*` → foster relationship begins at confirm-time; request becomes `active`.
   - other pending responses auto-rejected.
5. Owner finalizes temporary placement ("Pet is Returned"):
   - `foster_*` or `pet_sitting`: ends `foster` or `sitter` relationship; request becomes `finalized`.

## 1) Create a Placement Request (Owner)

- Endpoint: POST `/api/placement-requests`
- Authorization: pet owner

Request fields include:

- `pet_id`
- `request_type` (`permanent`, `foster_free`, `foster_paid`, `pet_sitting`)
- `notes`?
- `expires_at`?
- `start_date` (required)
- `end_date`? (nullable)

## 2) Respond to a Placement Request (Helper)

Helpers create PlacementRequestResponses (status starts as `responded`).

## 3) Accept a Helper Response (Owner)

- Endpoint: POST `/api/placement-responses/{placementResponse}/accept`
- Authorization: pet owner

Effects:

- Marks the PlacementRequestResponse as `accepted` (and sets `accepted_at`).

### `request_type = pet_sitting`

- Sets PlacementRequest status to `active` immediately.
- Creates/ensures an active `sitter` relationship for the helper.
- Auto-rejects all other `responded` responses.
- No TransferRequest is created.

### `request_type ∈ {permanent, foster_free, foster_paid}`

- Creates a TransferRequest with:
  - `from_user_id` = owner
  - `to_user_id` = helper
  - `status` = `pending`
- Sets PlacementRequest status to `pending_transfer`.
- Other responses remain `responded` until physical handover is confirmed (they will be auto-rejected at confirm-time).

Related endpoints:

- Reject a response (owner): POST `/api/placement-responses/{placementResponse}/reject`
- Cancel a response (helper): POST `/api/placement-responses/{placementResponse}/cancel`

## 4) Confirm Physical Handover (Helper)

Action: helper confirms they physically received the pet.

- Endpoint: POST `/api/transfer-requests/{transferRequest}/confirm`
- Authorization: only the TransferRequest `to_user` (recipient) can confirm.
- Idempotency: confirming an already confirmed transfer is a no-op and must not create duplicate relationships.

Effects:

- Marks TransferRequest `status = confirmed` and sets `confirmed_at`.
- Auto-rejects all other `responded` responses for the same placement request.

### Relationship effects by type

For `permanent`:

- Ends the previous owner’s active `owner` relationship.
- Creates/ensures an active `owner` relationship for the helper.
- Creates/ensures an active `viewer` relationship for the former owner (keeps read-only access).
- Sets PlacementRequest status to `finalized`.

For `foster_free` / `foster_paid`:

- Creates/ensures an active `foster` relationship for the helper with `start_at = now()`.
- Pet ownership remains with the original owner.
- Sets PlacementRequest status to `active`.

For `pet_sitting` (happens at acceptance time):

- Creates/ensures an active `sitter` relationship for the helper.
- Sets PlacementRequest status to `active`.

TransferRequest related endpoints:

- Reject transfer (owner / `from_user`): POST `/api/transfer-requests/{transferRequest}/reject`
- Cancel transfer (either party): DELETE `/api/transfer-requests/{transferRequest}`
- Responder profile: GET `/api/transfer-requests/{transferRequest}/responder-profile`

## 5) Finalize Temporary Placement (Owner)

Action: owner clicks "Pet is Returned" when fostering or sitting ends.

- Endpoint: POST `/api/placement-requests/{placementRequest}/finalize`
- Requirements:
  - PlacementRequest status must be `active`
  - PlacementRequest type must be `foster_free`, `foster_paid`, or `pet_sitting`
  - Only the current pet owner can call this endpoint

Effects:

- Sets PlacementRequest status to `finalized`.
- Ends the active `foster` or `sitter` relationship for the helper associated with this placement.
- Notifies the helper that the placement has ended.

## Permissions

- Create placement request: pet owner
- Accept/Reject placement response: pet owner
- Cancel placement response: helper (response author)
- Confirm transfer (physical handover): helper (TransferRequest `to_user`)
- Reject transfer: owner (TransferRequest `from_user`)
- Cancel transfer: either party
- Finalize placement (Pet is Returned): owner (only for `active` fostering)

## Data Model Notes

- **PlacementRequest**: status ∈ {`open`, `fulfilled`, `pending_transfer`, `active`, `finalized`, `expired`, `cancelled`}
- **PlacementRequestResponse**: status ∈ {`responded`, `accepted`, `rejected`, `cancelled`}
- **TransferRequest**: status ∈ {`pending`, `confirmed`, `rejected`, `expired`, `canceled`}
- **PetRelationship**: relationship_type ∈ {`owner`, `foster`, `sitter`, `editor`, `viewer`}; uses `start_at` / `end_at`.

## Client UX (Frontend) – Current

Helper view (public pet profile):

- After an owner accepts a response that requires a handover (`permanent`, `foster_*`), the helper sees a "Confirm" action while the placement request is `pending_transfer` and they have the pending TransferRequest.

Owner view (pet profile page):

- For `active` temporary fostering, owner sees "Pet is Returned" to finalize.

## Planned: Foster Return Handover Procedure

The current implementation uses the simpler "Pet is Returned" flow (finalization endpoint) instead of a full return-handover lifecycle.

The following is planned (not currently implemented):

- Initiate return (fosterer): create a return handover (scheduled_at/location).
- Owner confirms return conditions.
- Either party completes return and ends foster relationship.

## Note on PlacementRequest confirm/reject endpoints

Endpoints exist for:

- POST `/api/placement-requests/{placementRequest}/confirm`
- POST `/api/placement-requests/{placementRequest}/reject`

These are currently stubbed/TODO and not part of the active lifecycle described above.
