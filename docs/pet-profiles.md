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

Pet profiles have two access levels:

### Owner View (`/pets/:id`)

The full pet profile is accessible only to:

- **Pet owner**: Full access with edit permissions
- **Admin**: Full access with edit permissions

Owner view includes:

- All basic pet information
- Health records (weight, vaccinations, medical records)
- Placement requests with management capabilities
- Edit controls

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

Public view **excludes**:

- User/owner information
- Exact address
- Health records
- Edit permissions

## Routing Logic

When a user visits `/pets/:id`:

```
Is user the pet owner?
├── YES → Show owner view (PetProfilePage)
└── NO → Is pet publicly viewable (lost OR active placement)?
    ├── YES → Redirect to /pets/:id/public
    └── NO → Show "Access Restricted" message
```

When a user visits `/pets/:id/public`:

```
Is pet publicly viewable?
├── YES → Show public view (PetPublicProfilePage)
│   └── Is user the owner? → Show info banner
└── NO → Show "Not publicly available" error
```

## Owner Viewing Public Profile

When an owner visits the public view of their own pet:

- They see the public profile with a banner: "You are viewing the public profile of your pet."
- The "Respond to Placement Request" button is replaced with a message: "You cannot respond to your own pet's placement request."

## API Endpoints

### GET /api/pets/{id}

Full pet profile endpoint (existing).

- **Auth**: Optional (uses `optional.auth` middleware)
- **Access**: Owner, Admin, or users viewing pets with active placement requests
- **Returns**: Full pet data with `viewer_permissions`

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
      "is_owner": false
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

- `ShowPetController.php` - Full pet profile endpoint
- `ShowPublicPetController.php` - Public pet profile endpoint with whitelisted fields
- `PetPolicy.php` - Authorization policy with `isPubliclyViewable()` method

## Related Documentation

- [Rehoming Flow](./rehoming-flow.md) - How placement requests and transfers work
- [Categories System](./categories.md) - Pet categorization
