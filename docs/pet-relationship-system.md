# Pet Relationship System

This document describes the flexible pet-user relationship system that replaces the simple ownership model with a comprehensive relationship framework supporting multiple relationship types and temporal tracking.

## Overview

The pet relationship system allows pets to have multiple concurrent relationships with different users, each with specific access levels and temporal boundaries. This enables complex scenarios like co-ownership, fostering, and delegated management while maintaining a complete historical record.

## Relationship Types

The system supports four distinct relationship types:

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

- **Access Level**: Edit access for temporary caretaking
- **Use Cases**: Temporary fostering, animal shelter caretakers
- **Capabilities**:
  - Edit pet information
  - Update health records
  - Manage placement requests
  - Cannot transfer ownership
  - Cannot manage other relationships

### Editor Relationship

- **Access Level**: Edit access for pet management assistance
- **Use Cases**: Veterinarians, pet sitters, family members helping with pet care
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

## Data Model

### PetRelationship Model

```php
class PetRelationship extends Model
{
    protected $fillable = [
        'user_id',
        'pet_id',
        'relationship_type', // PetRelationshipType enum
        'start_date',
        'end_date', // null = active relationship
        'created_by', // user who created this relationship
    ];
}
```

### Database Schema

**pet_relationships table**:

- `id`: Primary key
- `user_id`: Foreign key to users table
- `pet_id`: Foreign key to pets table
- `relationship_type`: Enum ('owner', 'foster', 'editor', 'viewer')
- `start_date`: Date when relationship began
- `end_date`: Date when relationship ended (nullable)
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

## Access Control

### Permission Checking

The system provides methods to check user permissions for pets:

```php
// Check if user has specific relationship type
$pet->hasRelationshipWith($user, PetRelationshipType::OWNER);

// Check if user can edit the pet
$user->can('update', $pet); // Uses PetPolicy with relationship logic
```

### Viewer Permissions

API responses include `viewer_permissions` object indicating what the current user can do:

```json
{
  "viewer_permissions": {
    "can_edit": true,
    "can_manage_relationships": true,
    "can_transfer_ownership": true,
    "can_view_contact": false
  }
}
```

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
- [Rehoming Flow](./rehoming-flow.md) - How relationships work in placement scenarios
- [Architecture](./architecture.md) - Technical implementation details
