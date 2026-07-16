# Groups

Groups let users organize several pets and collaborate with people who care for them. They are optional: pets and direct `PetRelationship` records keep working without Groups, and the UI stays hidden until a user belongs to at least one Group.

Localized labels: Groups / Группы / Групи / Nhóm.

## Domain Rules

- A user may belong to multiple Groups; a pet may belong to multiple Groups or none
- Group membership never creates owner/editor/viewer `PetRelationship` rows
- Removing a user or pet from a Group never changes direct pet relationships
- Both Group roles (`admin`, `member`) grant editor-equivalent view/update for Group pets
- Ownership-only actions stay direct-owner-only: delete, transfer, manage people, add/remove pet from a Group
- A Group always has at least one active admin (last-admin mutations lock the Group row)

## API

Authenticated routes under `/api/groups` cover CRUD, members, pets, leave, and invitations. Pet creation accepts optional `group_id` (creator must be an active admin; assignment is atomic).

`GET /api/my-pets/sections?group_id=` filters the pets page to a Group context. Without it, All pets is the deduplicated union of direct and Group-accessible pets.

Authenticated pet responses may include Group entries in `viewer_permissions.access_sources`. Public pet responses never expose Group names or access sources.

## Frontend

- `/` — context selector when the user has Groups; selection mode to create/add pets
- `/groups`, `/groups/:groupId`, `/groups/:groupId/settings`
- Group mutations and context switching are online-only; offline falls back to cached All pets

## Ledger Hooks

`GroupLedgerSynchronization` is called synchronously on pet attach/detach and Group delete. Until Finance/Ledgers exist, the binding is a no-op (`NullGroupLedgerSynchronization`).

## Related

- [Pet Relationship System](./pet-relationship-system.md)
- [Pet Profiles](./pet-profiles.md)
- [API Conventions](./api-conventions.md)
