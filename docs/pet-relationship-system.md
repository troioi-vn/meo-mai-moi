# Pet Relationship System

This document describes the flexible pet-user relationship system that replaces the simple ownership model with a comprehensive relationship framework supporting multiple relationship types and temporal tracking.

## Overview

The pet relationship system allows pets to have multiple concurrent relationships with different users, each with specific access levels and temporal boundaries. This enables complex scenarios like co-ownership, fostering, and delegated management while maintaining a complete historical record.

## Relationship Types

The system supports five distinct relationship types. Access decisions are centralized in `PetAccessService` (distinct from `PetCapabilityService`, which answers which features a pet type supports).

### Owner Relationship

- **Access Level**: Full access including ownership transfer, relationship management, and pet deletion
- **Use Cases**: Primary pet owners, co-owners
- **Capabilities**:
  - Edit all pet information
  - Manage health records
  - Transfer ownership
  - Add/remove other relationships
  - Delete the pet profile

### Foster Relationship

- **Access Level**: View-only for temporary caretaking (current implementation)
- **Use Cases**: Temporary fostering, animal shelter caretakers
- **Capabilities**:
  - View pet information and health records
  - Appears in `fostering_active` / `fostering_past` My Pets sections
  - Cannot edit pet information, transfer ownership, or manage other relationships
- **Note**: Future foster editing would be a deliberate, separately tested change. Do not assume foster implies edit access.

### Sitter Relationship

- **Access Level**: View-only for temporary sitting
- **Use Cases**: Short-term sitting via placement flows
- **Capabilities**:
  - View pet information
  - Appears in the `shared` My Pets section
  - Cannot edit or manage relationships

### Editor Relationship

- **Access Level**: Edit access for pet management assistance
- **Use Cases**: Veterinarians, family members helping with pet care
- **Capabilities**:
  - Edit pet information
  - Update health records
  - Manage placement requests
  - Cannot transfer ownership
  - Cannot manage other relationships

### Viewer Relationship

- **Access Level**: Read-only access
- **Use Cases**: Family members, friends, interested adopters
- **Capabilities**:
  - View pet information
  - View health records
  - Cannot make any changes

## Access Sources And Future Groups

Authenticated private responses may include `access_sources` listing every active applicable source (for example concurrent owner + editor). Group-derived sources will be added by the Groups feature; Group access never satisfies direct-owner or people-management checks.

Main-app authorization does not use global admin-role shortcuts. Admin operational access stays on Filament/admin surfaces.
## Data Model

### PetRelationship Model

```php
class PetRelationship extends Model
{
    protected $fillable = [
        'user_id',
        'pet_id',
        'relationship_type', // PetRelationshipType enum
        'start_at',
        'end_at', // null = active relationship
        'created_by', // user who created this relationship
    ];
}
```

### Database Schema

**pet_relationships table**:

- `id`: Primary key
- `user_id`: Foreign key to users table
- `pet_id`: Foreign key to pets table
- `relationship_type`: Enum (`owner`, `foster`, `sitter`, `editor`, `viewer`)
- `start_at`: When relationship began
- `end_at`: When relationship ended (nullable; null = active)
- `created_by`: Foreign key to users table (who created relationship)
- `created_at`, `updated_at`: Timestamps

## Relationship Lifecycle

### Creating Relationships

Relationships are created with a start date and are active until an end date is set:

```php
// Create a new owner relationship
$relationship = PetRelationshipService::createRelationship(
    $user,
    $pet,
    PetRelationshipType::OWNER,
    $createdByUser,
    $startDate // optional, defaults to today
);
```

### Ending Relationships

Active relationships (where `end_date` is null) can be ended by setting an end date:

```php
PetRelationshipService::endRelationship($relationship, $endDate);
```

### Transferring Ownership

Ownership transfers create a new owner relationship while ending the previous one:

```php
PetRelationshipService::transferOwnership($pet, $fromUser, $toUser, $createdBy);
```

## Resource Invitations (Pets)

Owners can invite others to become co-owners, editors, or viewers via a shareable link or QR code. Pet invitations are the first target of the shared resource-invitation system (Groups and Ledgers reuse the same lifecycle later).

### Invitation Flow

1. **Owner creates invitation** — selects a role (owner/editor/viewer) and receives a unique link + QR code
2. **Link is shared** — via QR scan, copy-paste, or messaging
3. **Recipient opens link** — sees pet info, role, inviter name, and a countdown timer
4. **Recipient accepts or declines** — accepting creates the relationship; declining records the decision

### Unauthenticated Recipient Handling

When a recipient opens an invite link without being logged in (common when scanning a QR code in the browser), two complementary mechanisms preserve the invitation through the auth flow:

- **Redirect param chain**: The invite page redirects to `/login?redirect=/invite/{token}`. If the user navigates from login to registration, the `?redirect=` param is carried along. After successful login or registration, the user is redirected back to the invite page.
- **localStorage fallback** (`pendingResourceInvitationToken`): Before redirecting to login, the invite token is saved to `localStorage`. When the user becomes authenticated (via any method — email login, registration, Google OAuth), `App.tsx` checks for a pending token and redirects to the invite page. The token is cleared from `localStorage` once consumed. A one-time migration also reads the legacy `pendingInviteToken` key. This covers cases where the redirect param is lost (e.g., OAuth flows, browser restarts).

### Invitation Model

```
resource_invitations table:
  id, type (pet|group|ledger), invited_by_user_id, token (unique, 64 chars),
  status (pending|accepted|declined|revoked|expired),
  expires_at, accepted_by_user_id, accepted_at, declined_at, revoked_at

pet_resource_invitations detail table:
  resource_invitation_id (PK/FK), pet_id, relationship_type (owner|editor|viewer)
```

- Pet invitations expire after **1 hour** (configured in `config/resource_invitations.php`)
- The `token` is a 64-character random string used in the URL: `/invite/{token}`
- Expiry transitions are persisted by `ResourceInvitationService` during preview/accept (models do not mutate themselves on read)

### Role Assignment Logic

Accepting an invitation creates the requested active relationship without ending other active relationship types. This preserves the domain rule that a user can hold concurrent relationship types, such as owner plus viewer, when history or adjacent workflows require it.

- Exact-role accepts are idempotent
- Higher-role accepts do not erase lower-role relationships
- Preview exposes both `already_has_access` and `already_has_invited_role`
- Owner-managed role changes use the editable sharing role group (`owner`, `editor`, `viewer`) and intentionally set exactly one active sharing role for that user

### Invitation Management

- **List pending**: Owners see all pending invitations with countdown timers, share URLs, and a share button to re-open the QR/link dialog
- **Accepted while viewing**: If a pending invitation is accepted while an owner has the QR/link dialog open, the dialog closes and the People list refreshes
- **Revoke**: Owners can cancel a pending invitation before it's accepted
- **Self-invite guard**: Users cannot accept their own invitations (422)
- **Expired guard**: Attempting to accept an expired invitation returns 410
- Losing direct ownership eagerly revokes pending invitations issued by that former owner

### API Endpoints

```
POST   /api/pets/{pet}/invitations                       # Create invitation (owner only)
GET    /api/pets/{pet}/invitations                       # List pending (owner only)
DELETE /api/pets/{pet}/invitations/{id}                  # Revoke (owner only)
PUT    /api/pets/{pet}/users/{user}                      # Change owner/editor/viewer role (owner only)
DELETE /api/pets/{pet}/users/{user}                      # Remove owner/editor/viewer sharing access (owner only)
GET    /api/resource-invitations/{token}                 # Preview (public, optional auth)
POST   /api/resource-invitations/{token}/accept          # Accept (authenticated)
POST   /api/resource-invitations/{token}/decline         # Decline (authenticated)
```

### Frontend

- **PetRelationshipsSection** — "Add person" button opens a dialog with role selection, then shows QR code + copyable link. Pending invitations are listed with countdown timers and share/revoke buttons. Owners can click owner/editor/viewer badges in the People list to change a person's role or remove their sharing access. Share URLs come from the API (`invitation_url` via configured frontend origin).
- **ResourceInvitationPage** (`/invite/:token`) — shared recipient page; saves the token to `localStorage` as `pendingResourceInvitationToken` and redirects unauthenticated users to login with a return URL. Clears the stored token only after acceptance, decline, or a terminal invalid state.

## Leaving and Removing Relationships

### Leave

Any user with an active relationship can leave a pet voluntarily, **except** the last remaining owner (a pet must always have at least one owner).

```
POST /api/pets/{pet}/leave
```

- Ends all active relationships for the requesting user
- Returns 409 if the user is the sole owner
- Available from both the pet profile page (editors/co-owners) and the public profile page (viewers)

### Remove

Owners can remove owner/editor/viewer sharing access from another user, including co-owners, as long as at least one active owner remains.

```
DELETE /api/pets/{pet}/users/{user}
```

- Only accessible to pet owners
- Returns 409 if attempting to remove the last owner

### Change Role

Owners can change another user's editable sharing role among owner, editor, and viewer. This ends the user's other active owner/editor/viewer relationships for the pet and creates or keeps the selected role.

```
PUT /api/pets/{pet}/users/{user}
{
  "relationship_type": "editor"
}
```

- Only accessible to pet owners
- Co-owners have the same management permissions as the original owner
- Users cannot change their own role through this endpoint
- Returns 409 if the requested change would leave the pet with no active owner

## Access Control

### Permission Checking

Use `PetAccessService` for access decisions. Narrow model helpers such as `hasRelationshipWith` and `isOwnedBy` remain for relationship existence checks. Broad helpers `canBeViewedBy` / `canBeEditedBy` are deprecated.

```php
$access = app(PetAccessService::class);

$access->canView($user, $pet);
$access->canEdit($user, $pet);
$access->isDirectOwner($user, $pet);
$access->canManagePeople($user, $pet);
$access->accessSources($user, $pet);
$access->viewerPermissions($user, $pet);

// Policy still gates routes:
$user->can('update', $pet); // PetPolicy delegates to PetAccessService
```

Special view paths (not edit access, not direct relationships):

- Public placement (`OPEN`) or lost-pet status
- Pending transfer recipients

### Viewer Permissions

Authenticated private responses include a normalized `viewer_permissions` object:

```json
{
  "viewer_permissions": {
    "can_edit": true,
    "can_delete": false,
    "can_manage_people": false,
    "can_transfer_ownership": false,
    "can_view_contact": true,
    "is_owner": false,
    "is_editor": true,
    "is_viewer": false,
    "is_foster": false,
    "is_sitter": false,
    "access_sources": [
      { "type": "relationship", "role": "editor" }
    ]
  }
}
```

- `is_*` fields describe active direct relationships only
- `can_edit` may become true via future Group access; delete / manage people / transfer remain direct-owner-only
- Public responses expose only a safe subset (`is_owner`, `is_viewer`, `has_active_relationship`) and never include `access_sources`

### My Pets Sections

`GET /api/my-pets/sections` returns deduplicated sections with priority `owned > fostering_active > shared > fostering_past`. Every current pet card includes normalized `viewer_permissions`. The `group_id` query parameter belongs to the Groups stage and is not accepted as a filter yet.

## Migration from Old System

### Previous System

- Simple `user_id` foreign key on pets table
- Pivot tables for editors and viewers (`pet_user` table)
- OwnershipHistory table for historical tracking
- Limited to one owner per pet

### New System Benefits

- **Multiple Relationships**: Pets can have multiple owners, fosters, editors, and viewers simultaneously
- **Temporal Tracking**: Complete history with start/end dates for all relationships
- **Flexible Access**: Support for complex scenarios like fostering and co-ownership
- **Audit Trail**: Track who created each relationship and when
- **Future-Proof**: Easy to add new relationship types as needed

### Migration Process

1. **Data Migration**: Existing ownership converted to owner relationships
2. **Editors/Viewers**: Converted from pivot tables to relationship records
3. **Historical Data**: OwnershipHistory migrated to relationship records with proper dates
4. **Backwards Compatibility**: API maintains similar interface while using new backend

## API Integration

### Relationship Management Endpoints

```php
// Add editor access
POST /api/pets/{pet}/relationships
{
  "user_id": 123,
  "relationship_type": "editor"
}

// Remove user access
DELETE /api/pets/{pet}/relationships/{relationship}

// Transfer ownership
POST /api/pets/{pet}/transfer-ownership
{
  "to_user_id": 456
}
```

### Querying Relationships

```php
// Get all active relationships for a pet
$relationships = $pet->activeRelationships;

// Get all pets for a user by relationship type
$ownedPets = PetRelationshipService::getPetsByRelationshipType($user, PetRelationshipType::OWNER);
$fosteredPets = PetRelationshipService::getPetsByRelationshipType($user, PetRelationshipType::FOSTER);
```

## Business Logic Examples

### Fostering Scenario

1. Owner creates placement request for fostering
2. Helper accepts and confirms handover
3. System creates foster relationship for helper
4. Owner retains owner relationship
5. When fostering ends, foster relationship is ended

### Ownership Transfer

1. Owner initiates transfer (permanent placement)
2. New owner confirms handover
3. System creates new owner relationship for new owner
4. Previous owner relationship is ended
5. Historical record maintained

### Co-Ownership

1. Multiple users can have active owner relationships
2. All owners have full access and transfer capabilities
3. Relationship history tracks all ownership changes

## Benefits

- **Flexibility**: Support for complex pet care arrangements
- **Auditability**: Complete historical record of all relationships
- **Scalability**: Easy to add new relationship types
- **Consistency**: Unified system for all pet-user interactions
- **Future-Proof**: Extensible for additional relationship types and features

## Related Documentation

- [Pet Profiles](./pet-profiles.md) - How relationships affect profile access
- [Placement Request Lifecycle](./placement-request-lifecycle.md) - How relationships work in placement scenarios
- [User Invitations](./invites.md) - Platform-level user invitations (separate from resource invitations)
- [Architecture](./architecture.md) - Technical implementation details
