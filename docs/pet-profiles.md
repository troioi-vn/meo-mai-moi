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

#### Owner/Foster/Editor View (`/pets/:id`)

The full pet profile is accessible to users with active relationships granting edit permissions:

- **Owners**: Full access including ownership transfer, relationship management, and pet deletion
- **Fosters**: Edit access for pet care during fostering periods
- **Editors**: Edit access for pet management assistance
- **Admins**: Full administrative access regardless of relationships

Full view includes:

- All basic pet information
- Health records (weight, vaccinations, medical records)
- Placement requests with management capabilities
- Relationship management (adding/removing editors, viewers)
- Edit controls

#### Viewer Access

Users with viewer relationships can access the pet profile but cannot make changes:

- Read-only access to basic information
- Can view health records and placement requests
- Cannot edit information or manage relationships
- Cannot perform ownership transfers

### Public View (`/pets/:id/public`)

A limited public profile is accessible when the pet is **publicly viewable**. A pet is publicly viewable if:

1. **Pet status is "lost"** - Lost pets are always publicly viewable to help find them
2. **Pet has an active placement request** - Pets up for adoption/fostering are publicly viewable

Public view includes (whitelisted fields only):

- Basic info: name, sex, age, species
- Location: country, state, city (no street address)
- Description
- Photos
- Categories
- Active placement requests
- Viewer permission flags (relationship awareness, no edit controls)

Public view **excludes**:

- User/relationship information
- Exact address
- Health records (unless user has appropriate relationship)
- Edit permissions

## Routing Logic

When a user visits `/pets/:id`:

```
Does user have edit relationship (owner/foster/editor) with pet?
├── YES → Show full view (PetProfilePage)
└── NO → Does user have viewer relationship?
    ├── YES → Show viewer view (read-only full profile)
    └── NO → Is pet publicly viewable (lost OR active placement)?
        ├── YES → Redirect to /pets/:id/public
        └── NO → Show "Access Restricted" message
```

When a user visits `/pets/:id/public`:

```
Is pet publicly viewable?
├── YES → Show public view (PetPublicProfilePage)
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
- **Access**: Users with active relationships (owner/foster/editor/viewer), Admin, or users viewing pets with active placement requests
- **Returns**: Full pet data with `viewer_permissions`
  - `viewer_permissions` includes:
    - `can_edit` (owner/foster/editor/admin)
    - `can_manage_relationships` (owner/admin)
    - `can_transfer_ownership` (owner/admin)
    - `can_view_contact` (admin or authenticated users with relationships)

### GET /api/pets/{id}/public

Public pet profile endpoint (new).

- **Auth**: Optional
- **Access**: Anyone, but only for publicly viewable pets
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
      "can_edit": false,
      "can_view_contact": true
    }
  }
}
```

## Components

### Frontend

- `PetProfilePage.tsx` - Owner view with full profile and health records
- `PetPublicProfilePage.tsx` - Public view with limited information
- `PublicPlacementRequestSection.tsx` - Placement request section for public view with respond functionality

### Backend

- `ShowPetController.php` - Full pet profile endpoint with relationship-based access control
- `ShowPublicPetController.php` - Public pet profile endpoint with whitelisted fields
- `PetPolicy.php` - Authorization policy with relationship-based permissions and `isPubliclyViewable()` method
- `PetRelationshipService.php` - Service for managing pet-user relationships
- `PetRelationship.php` - Model representing relationships between pets and users

## Related Documentation

- [Rehoming Flow](./rehoming-flow.md) - How placement requests and transfers work
- [Categories System](./categories.md) - Pet categorization
