# Pet Profiles

This document describes the pet profile system, including public vs. private views and access control.

## Overview

Pet profiles contain detailed information about a pet, including:

- Basic info (name, age, sex, species)
- Location (country, state, city)
- Description
- Photos
- Categories/tags
- Health records (vaccinations, medical records, weight history)
- Placement requests (for rehoming)

## Access Control

Pet profiles use a flexible relationship system that supports multiple user roles per pet. Each pet can have multiple active relationships with different users, allowing for complex scenarios like co-ownership, fostering, and delegated management.

### Relationship Types

The system supports four relationship types:

- **Owner**: Full access with ownership rights, including the ability to transfer ownership, manage relationships, and delete the pet
- **Foster**: Caretaking access for temporary fostering situations, with edit permissions but no ownership rights
- **Editor**: Edit access for pet management assistance, including updating information and managing health records
- **Viewer**: Read-only access for monitoring pet information without edit capabilities

### Access Levels

#### Owner/Editor View (`/pets/:id`)

The full pet profile is accessible to users with an active direct relationship that grants view access. Edit controls require owner or editor (foster/sitter are view-only today).

- **Owners**: Full access including ownership transfer, relationship management, and pet deletion
- **Editors**: Edit access for pet management assistance
- **Fosters / Sitters**: View-only access via active relationships (no main-app edit)
- **Admins**: Operational access stays on Filament/admin surfaces; main-app API does not grant admin-role shortcuts

Full view includes:

- All basic pet information
- Health records (weight, vaccinations, medical records) for editors/owners
- Placement requests with management capabilities (editors/owners)
- Relationship management — invite people via QR/link, view pending invitations, change owner/editor/viewer roles, and remove sharing access while keeping at least one owner
- Leave button for editors and co-owners (hidden for the last remaining owner)
- Edit controls when `viewer_permissions.can_edit` is true

#### Viewer Access

Users with viewer relationships can access the pet profile but cannot make changes:

- Read-only access to basic information
- Can view health records and placement requests
- Cannot edit information or manage relationships
- Cannot perform ownership transfers

On the public view page, viewers see a banner with a **Leave** button to voluntarily end their access.

### View Page (`/pets/:id/view`)

A limited profile view is accessible based on several conditions. The view page is accessible if:

1. **User is the pet owner** - Owners can always view their pets
2. **User has a PetRelationship** - Users with 'owner' or 'viewer' relationship type can view
3. **Pet status is "lost"** - Lost pets are publicly viewable to help find them
4. **Pet has an active placement request** - Pets up for adoption/fostering (status: 'open') are publicly viewable
5. **User is involved in a pending transfer** - Helpers who are recipients of a pending transfer request (placement request status: 'pending_transfer') can view

View page includes (whitelisted fields only):

- Basic info: name, sex, age, species
- Location: country, state, city (no street address)
- Description
- Photos
- Categories
- Active placement requests
- Viewer permission flags (relationship awareness, no edit controls)

View page **excludes**:

- User/relationship information
- Exact address
- Health records (unless user has appropriate relationship)
- Edit permissions

## Routing Logic

When a user visits `/pets/invite/:token`:

```
Fetch invitation preview (public endpoint)
├── Not found → Show error
├── Not authenticated → Redirect to /login?redirect=/pets/invite/:token
└── Authenticated → Show invitation details (pet, role, inviter, countdown)
    ├── Accept → Create relationship, navigate to pet profile
    └── Decline → Record decision, navigate home
```

When a user visits `/pets/:id`:

```
Does user have edit relationship (owner/foster/editor) with pet?
├── YES → Show full view (PetProfilePage)
└── NO → Does user have viewer relationship?
    ├── YES → Show viewer view (read-only full profile)
    └── NO → Is pet publicly viewable (lost OR active placement)?
        ├── YES → Redirect to /pets/:id/view
        └── NO → Show "Access Restricted" message
```

When a user visits `/pets/:id/view`:

```
Can user view the pet? (owner, viewer relationship, pending transfer recipient, or publicly viewable)
├── YES → Show view page (PetPublicProfilePage)
│   └── Does user have relationship with pet? → Show info banner
└── NO → Show "Not publicly available" error
```

## Relationship Holders Viewing Public Profile

When a user with a relationship to a pet visits the public view:

- They see the public profile with a banner indicating their relationship: "You are viewing the public profile of [pet name]."
- The "Respond to Placement Request" button is replaced with a message: "You cannot respond to placement requests for pets you have a relationship with."

## API Endpoints

### GET /api/pets/{id}

Full pet profile endpoint (existing).

- **Auth**: Optional (uses `optional.auth` middleware)
- **Access**: Users with active relationships (owner/foster/sitter/editor/viewer), pending transfer recipients, or publicly viewable pets (lost / open placement). No main-app admin-role shortcut.
- **Returns**: Full pet data with normalized `viewer_permissions`
  - `can_edit` (owner/editor; future Group access may also grant edit)
  - `can_delete`, `can_manage_people`, `can_transfer_ownership` (direct owner only)
  - `can_view_contact` (authenticated non-owners who can view)
  - `is_owner` / `is_editor` / `is_viewer` / `is_foster` / `is_sitter`
  - `access_sources` (private responses only)
### GET /api/pets/{id}/view

View pet profile endpoint.

- **Auth**: Optional
- **Access**:
  - Pet owner (always)
  - Users with 'owner' or 'viewer' PetRelationship
  - Helpers involved in pending transfers (PlacementRequest status: 'pending_transfer')
  - Anyone for publicly viewable pets (lost OR active placement request)
- **Returns**: Whitelisted fields only

Response includes:

```json
{
  "data": {
    "id": 1,
    "name": "Fluffy",
    "sex": "female",
    "birthday_precision": "year",
    "birthday_year": 2020,
    "country": "US",
    "state": "California",
    "city": "Los Angeles",
    "description": "A friendly cat",
    "status": "active",
    "pet_type_id": 1,
    "photo_url": "...",
    "photos": [...],
    "pet_type": {...},
    "categories": [...],
    "placement_requests": [...],
    "viewer_permissions": {
      "is_owner": false,
      "is_viewer": true,
      "has_active_relationship": true
    }
      "is_editor": false,
      "can_edit": false,
      "can_manage_people": false,
      "has_active_relationship": true,
      "can_view_contact": true
    }
  }
}
```

## Components

### Frontend

- `PetProfilePage.tsx` - Owner view with full profile and health records
- `PetPublicProfilePage.tsx` - Public view with limited information; includes leave banner for viewers
- `PetRelationshipsSection.tsx` - Relationship management: invite people, view pending invitations, remove/leave
- `RelationshipInvitationPage.tsx` - Standalone page for accepting/declining invitations (`/pets/invite/:token`)
- `PublicPlacementRequestSection.tsx` - Placement request section for public view with respond functionality

### Backend

- `ShowPetController.php` - Full pet profile endpoint with relationship-based access control
- `ShowPublicPetController.php` - Public pet profile endpoint with whitelisted fields
- `PetPolicy.php` - Authorization policy with relationship-based permissions and `isPubliclyViewable()` method
- `PetRelationshipService.php` - Service for managing pet-user relationships
- `RelationshipInvitationService.php` - Invitation creation, acceptance, decline, revocation, and role upgrade logic
- `PetRelationship.php` - Model representing relationships between pets and users
- `RelationshipInvitation.php` - Model representing pending/resolved invitations

## Related Documentation

- [Pet Relationship System](./pet-relationship-system.md) - Relationship types, invitations, and leave/remove flows
- [Placement Request Lifecycle](./placement-request-lifecycle.md) - How placement requests and transfers work
- [Categories System](./categories.md) - Pet categorization
