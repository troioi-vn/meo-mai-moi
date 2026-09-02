# Group Placement

How a rescue rehomes a cat: any volunteer in a Group can create and run placement requests for the Group's pets, not just whoever happens to hold the ownership record.

This document is the design record for that change. The mechanics of the flow itself live in [Placement Request Lifecycle](./placement-request-lifecycle.md); this one explains who may act, and why the boundaries fall where they do.

## The problem it solved

Placement authority was split between two contradictory definitions of "owner", and they already disagreed with each other:

| Where | What it meant by "owner" |
| --- | --- |
| `PlacementRequestPolicy` (view/update/delete/confirm/reject) | an active `owner` `PetRelationship` |
| `PlacementRequestResponsePolicy` (accept/reject), the accept controller, chat lookup, transfer creation | `placement_requests.user_id`, i.e. whoever clicked "create" |

The two coincided only because creating a request demanded ownership and stamped `user_id` with the creator. They diverged the moment ownership moved, because `PetRelationshipService::transferOwnership()` never rewrote that column — so after any handover, the *previous* owner still governed accept/reject and chat for that pet's other requests.

Groups did not introduce that bug. They made it reachable: a volunteer creating a listing for a cat owned by another volunteer produced a request whose `user_id` pointed at someone with no ownership at all.

## The fix

One predicate governs every owner-side placement action:

```
PetAccessService::canManagePlacements($user, $pet)
    = isDirectOwner($user, $pet) || hasGroupAccess($user, $pet)
```

`placement_requests.user_id` is audit data from here on — "who created this" — and is never read for an authorization decision.

The predicate deliberately sits **between** the two tiers that already existed:

- above `canEdit()`, which includes `editor` relationships. Someone you added to help track vaccinations should not be able to list your cat for rehoming.
- below `canManagePeople()`, which is direct-owner-only. Requiring ownership here would defeat the whole feature.

`viewer_role` stays a three-value string (`owner` | `helper` | `public`) and is resolved in one place, `PlacementViewerRoleService`. A group member reads as `owner`.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | Authority is `canManagePlacements`, not `canEdit` | Placing a pet can end ownership; editors must not reach it |
| 2 | Permanent handover uses `transferAllOwnership` | Correct today and if co-owners ever exist; "cat adopted but a volunteer still owns it" stays unreachable |
| 3 | `GroupPet.end_at` is set on permanent finalization | An adopter's cat must not stay editable by a rescue they have left |
| 4 | Group members read as `owner` and cannot respond | One role string cannot be owner-side and helper-side on the same request without breaking `can_accept_responses` |
| 5 | One `PRIVATE_GROUP` chat per (request, responder) | Private DMs per volunteer defeat the point; `Chat` already supported N participants |
| 6 | All members in-app; email to creator and admins only | Nobody misses a response; nobody gets twenty emails per cat |
| 7 | A `group_past` section keyed on ended assignments | A rescue keeps the record of what it rehomed, without anyone gaining access to the pet |
| 8 | Joining opens threads for open requests only; leaving sets `left_at` | No backlog dump on a newcomer; no departed volunteer reading adopter mail |
| 9 | The thread names the group and counts its readers | Otherwise someone describes their home to what they believe is one person |
| 10 | A live response or transfer makes you `helper` for that request | Blocks accepting your own application, without punishing a volunteer fostering a different cat |
| 11 | No viewer grant to the former owner on group handovers | Same reason as 3, narrowed to one person |
| 12 | The accept path takes a row lock | The race predates Groups but a shared listing is what makes it ordinary |

## Ownership on handover

For a **permanent** placement of a group-held pet:

1. `TransferRequest.from_user_id` is derived from the pet's current direct owner — the active `owner` relationship with the earliest `start_at`, tie-broken by lowest `user_id`. Never from `user_id`.
2. Confirmation calls `transferAllOwnership`, so **every** active `owner` relationship ends and the adopter becomes the only owner. The replacement is created before the others end, so the pet is never ownerless.
3. The pet is detached from every Group via `GroupPetService::endAllActiveAssignmentsForPet()`, which also fires the ledger detach hook.
4. The former owner gets **no** consolation `viewer` relationship. For a personal (non-group) rehoming that grant is unchanged.

Foster and pet-sitting placements keep the Group attachment and leave ownership alone.

Detaching a pet from a Group is refused while it has a request in `open` or `pending_transfer`, since that would strip authority from the volunteers currently handling responses.

## Concurrency

`PlacementRequestResponse::accept()` used to check that the request was still `open` and then write, with no transaction and no lock. One owner had to race themselves across two browser tabs to hit it. Twenty volunteers watching one listing makes it ordinary.

The decision is now remade inside a transaction under `lockForUpdate()`, taking the request row first (it is the contended one) and then the response. A caller that passed the unlocked pre-check and then lost the race gets `PlacementException::responseRaceLost()`, mapped to **409** — distinct from the **403** an ordinary invalid transition still returns.

The create-side "one live request per type per pet" rule had the same read-then-write shape. It is now backed by a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX placement_requests_active_type_unique
  ON placement_requests (pet_id, request_type)
  WHERE deleted_at IS NULL AND status IN ('open','pending_transfer','active');
```

The controller check remains as an optimisation for the common case; the index is what actually holds the rule. **The migration refuses to run if existing rows would violate it**, naming the offending `pet_id` values rather than cancelling anyone's live listing to make itself pass. Check before deploying to a populated database:

```sql
SELECT pet_id, request_type, count(*) FROM placement_requests
WHERE deleted_at IS NULL AND status IN ('open','pending_transfer','active')
GROUP BY 1,2 HAVING count(*) > 1;
```

## Notifications

`NotificationService` is per-user and has no fan-out helper, so `PlacementNotifier` resolves the audience once and loops:

- **in-app**: every active member of every Group holding the pet, plus the pet's direct owners
- **email and Telegram**: only the request's creator and the Group admins

The two sets are disjoint, so a user who is owner, creator and admin at once is notified exactly once per channel. Each recipient's stored `NotificationPreference` still applies — the fan-out never overrides an opt-out. A pet in no Group behaves exactly as before: one recipient, full treatment.

There is deliberately **no per-group mute**. `NotificationPreference` is keyed on `(user, type)` alone, so a volunteer in two rescues cannot silence one. That is the first thing to add if this becomes annoying.

## Chat

A group-held pet gets one `PRIVATE_GROUP` chat per responder, contextable on the placement request. Participants are the responder plus every active member; Group admins get `ChatUserRole::ADMIN`, everyone else `MEMBER`, the responder always `MEMBER`.

`ChatPolicy` already authorizes on `activeParticipants`, so a `chat_users` row with `left_at` set is what actually revokes access. `GroupPlacementChatService` keeps that in step across all of `addMember`, `removeMember`, `removeMemberAsModerator`, `leave`, `endAllActiveMemberships`, and `updateRole`. Missing one would leave a departed volunteer reading an adopter's messages, which is the failure worth being paranoid about.

- **leaving** sweeps every thread the Group ever had, including pets already detached by adoption. The messages stay for whoever remains.
- **joining** only opens threads for requests still `open`.
- **rejoining** clears `left_at` rather than inserting a second pivot row.

Responders see who they are talking to: the thread is titled with the Group's name and states how many people can read it, and senders keep their real names. Bearer tokens cannot open or post into a group thread.

Pets in no Group keep ordinary direct chats. Existing direct placement chats were not migrated.

## Known limits

- **In-group fostering is closed.** A volunteer fostering their own rescue's cat is a common real-world case, but decision 4 blocks responding to your own Group's request. The right shape is a dedicated "assign a foster" action for members, not a self-response through the public helper flow.
- **`user_id` keeps its name** despite meaning `created_by_user_id`. Renaming touches Filament resources, OpenAPI schemas and frontend call sites.
- **An accepted pet-sitter who is a Group member reads as owner-side** for that request, because sitting acceptances create no `TransferRequest` and move the response to `accepted` rather than leaving it `responded`. The only ability this unlocks is finalizing their own sitting stint.
- **No per-group notification preference**, as above.
- The foster-blocks-new-placement question flagged in `StorePlacementRequestController` is still undecided and is more visible with rescues.

## Related

- [Placement Request Lifecycle](./placement-request-lifecycle.md)
- [Groups](./groups.md)
- [Pet Relationship System](./pet-relationship-system.md)
- [Notifications](./notifications.md)
