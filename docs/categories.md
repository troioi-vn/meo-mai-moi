# Categories System

This document explains the Categories system - a flexible tagging system that allows users and admins to categorize pets with breed, type, or other pet-specific characteristics.

## Overview

Categories enable pet owners and administrators to organize and tag pets with meaningful labels such as breed information, size, training status, age group, and other distinguishing characteristics. Each category is specific to a pet type (cat, dog, bird, rabbit, etc.).

**Key Features:**

- Pet-type-specific categories (cats have different categories than dogs)
- Dual-mode creation: admins create via admin panel, users create on-demand during pet creation/editing
- Approval workflow: user-created categories require admin approval before appearing in general lists
- Usage tracking: automatic count of pets using each category
- Max limit enforcement: up to 10 categories per pet
- Search and autocomplete: real-time category filtering
- Full-text search support for category discovery

**Key Components:**

- Backend Model: `backend/app/Models/Category.php`
- Database: Two tables - `categories` and `pet_categories` (pivot)
- API Endpoints: `GET /api/categories`, `POST /api/categories`
- Admin Panel: Full CRUD via Filament Resource at Admin → System → Categories
- Frontend Component: `CategorySelect` multi-select with autocomplete and create capability

## Backend Architecture

### Database Schema

#### `categories` Table

```sql
id                  bigint (primary key)
name                varchar(50) - category name (e.g., "Siamese", "Tabby", "Long-haired")
slug                varchar(60) - URL-friendly name (auto-generated, unique per pet type)
pet_type_id         bigint (foreign key) - references pet_types.id on delete cascade
description         text (nullable) - category description/guidelines
created_by          bigint (nullable, foreign key) - user who created it (null if seed/admin-created)
approved_at         timestamp (nullable) - approval timestamp (null = pending user review)
created_at          timestamp
updated_at          timestamp

-- Unique constraints
UNIQUE(name, pet_type_id)          -- Name must be unique per pet type
UNIQUE(slug, pet_type_id)          -- Slug must be unique per pet type

-- Indices
INDEX(pet_type_id, name)           -- For filtering by pet type + search
```

#### `pet_categories` Pivot Table

```sql
id                  bigint (primary key)
pet_id              bigint (foreign key) - references pets.id on delete cascade
category_id         bigint (foreign key) - references categories.id on delete cascade
created_at          timestamp
updated_at          timestamp

-- Unique constraint
UNIQUE(pet_id, category_id)        -- Prevent duplicate pet-category assignments
```

### Model: Category

Located at `backend/app/Models/Category.php`

**Relationships:**

- `petType()`: BelongsTo `PetType` - the pet type this category applies to
- `pets()`: BelongsToMany `Pet` via `pet_categories` pivot
- `creator()`: BelongsTo `User` (created_by) - user who created the category

**Attributes:**

- `name`: Category display name (50 char max)
- `slug`: Auto-generated from name, unique per pet type
- `description`: Optional markdown/text description
- `created_by`: User ID of creator (null if admin-created)
- `approved_at`: Approval timestamp (determines visibility)
- `usage_count`: Virtual attribute - count of pets using this category (read-only, computed)

**Scopes:**

- `forPetType($petTypeId)`: Filter by pet type
- `approved()`: Only show admin-approved categories
- `visibleTo(User $user)`: Show approved categories + categories created by the user
- `pending()`: Only show unapproved categories
- `byUsage()`: Order by usage count descending

**Methods:**

- `isApproved()`: Check if category is approved
- `approve()`: Set approval timestamp to now
- `disapprove()`: Clear approval timestamp
- `getUsageCountAttribute()`: Compute count of pets with this category
- `boot()`: Generates slug automatically on create/update

**Boot Method Auto-Slug Generation:**

```php
protected static function boot()
{
    parent::boot();

    static::creating(function ($model) {
        if (!$model->slug) {
            $model->slug = self::generateUniqueSlug($model->name, $model->pet_type_id);
        }
    });

    static::updating(function ($model) {
        if ($model->isDirty('name')) {
            $model->slug = self::generateUniqueSlug($model->name, $model->pet_type_id);
        }
    });
}

// Generates slug with numeric suffix if needed (e.g., "siamese-1", "siamese-2")
private static function generateUniqueSlug($name, $petTypeId) { ... }
```

### Migrations

**2025_12_04_000001_create_categories_table.php**

- Creates `categories` table with all fields and constraints
- Adds indices for performance
- Foreign key references to `pet_types` and `users`

**2025_12_04_000002_create_pet_categories_table.php**

- Creates `pet_categories` pivot table
- Unique constraint on [pet_id, category_id] prevents duplicates
- Cascade delete on both directions

### Factory & Seeding

**CategoryFactory** (`backend/database/factories/CategoryFactory.php`)

- State options: `approved()`, `pending()`, `forPetType($petTypeId)`
- Random description generation
- Example usage:

```php
Category::factory()->approved()->forPetType($catTypeId)->create(['name' => 'Siamese']);
Category::factory()->pending()->forPetType($dogTypeId)->count(5)->create();
```

**CategorySeeder** (`backend/database/seeders/CategorySeeder.php`)

- Pre-seeds 30+ categories for cats and dogs
- **Cats**: Siamese, Persian, Maine Coon, British Shorthair, Ragdoll, Bengal, Sphynx, Scottish Fold, Abyssinian, Mixed Breed, Long-haired, Short-haired, Indoor, Outdoor, Senior, Kitten
- **Dogs**: Labrador, Golden Retriever, German Shepherd, Beagle, Bulldog, Poodle, Rottweiler, Yorkshire Terrier, Boxer, Dachshund, Shiba Inu, Husky, Mixed Breed, Small/Medium/Large Breed, Puppy, Senior, Trained
- All seeded as `approved_at = now()` (trusted seed data)
- Uses `firstOrCreate` to prevent duplicate insertion on re-run
- Registered in `DatabaseSeeder`

### API Controllers

#### ListCategoriesController

**Endpoint:** `GET /api/categories`

**Query Parameters:**

- `pet_type_id` (required): ID of the pet type to filter by
- `search` (optional): Search term for category name/description

**Response:** JSON array of Category objects

```json
[
  {
    "id": 1,
    "name": "Siamese",
    "slug": "siamese",
    "pet_type_id": 1,
    "description": "Siamese breed",
    "created_by": null,
    "approved_at": "2025-12-04T00:00:00Z",
    "usage_count": 5,
    "created_at": "2025-12-04T00:00:00Z",
    "updated_at": "2025-12-04T00:00:00Z"
  }
]
```

**Logic:**

1. Validates `pet_type_id` is required and exists
2. Filters categories by pet type
3. If user is authenticated: shows approved categories + categories they created
4. If user is not authenticated: shows only approved categories
5. If search term provided: filters name and description using case-insensitive ilike match
6. Returns empty array if no matches

**Example Requests:**

```bash
# Get all approved cat categories
GET /api/categories?pet_type_id=1

# Search for cat categories containing "persian"
GET /api/categories?pet_type_id=1&search=persian

# Includes user-created pending categories if authenticated
GET /api/categories?pet_type_id=1&search=tabby \
  -H "Authorization: Bearer {token}"
```

#### StoreCategoryController

**Endpoint:** `POST /api/categories` (requires authentication)

**Request Body:**

```json
{
  "name": "Calico",
  "pet_type_id": 1,
  "description": "Multi-colored cat pattern"
}
```

**Validation:**

- `name`: required, string, max 50 chars
- `pet_type_id`: required, integer, must exist in pet_types
- `description`: optional, string, max 500 chars
- Unique constraint: name + pet_type_id combination must not already exist

**Response:** Created Category object (201 status)

```json
{
  "id": 42,
  "name": "Calico",
  "slug": "calico",
  "pet_type_id": 1,
  "description": "Multi-colored cat pattern",
  "created_by": 5,
  "approved_at": null,
  "usage_count": 0,
  "created_at": "2025-12-04T14:30:00Z",
  "updated_at": "2025-12-04T14:30:00Z"
}
```

**Logic:**

1. Validates request data
2. Checks name doesn't already exist for this pet type
3. Auto-generates unique slug from name
4. Sets `created_by` to current user
5. Sets `approved_at` to null (requires admin approval)
6. Returns created category

**Example Request:**

```bash
POST /api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Calico",
    "pet_type_id": 1,
    "description": "Multi-colored cat pattern"
  }'
```

### Pet Controller Integration

**StorePetController** - Added category support:

- Accepts `category_ids` array in request: `[1, 2, 3]`
- Validates all IDs exist in categories table
- After pet creation, syncs categories via pivot table:

```php
$pet->categories()->sync($validated['category_ids'] ?? []);
```

**UpdatePetController** - Added category support:

- Same `category_ids` validation and sync
- Allows user to change pet categories without recreating pet

**ShowPetController** - Category loading:

- Eager loads categories relationship:

```php
Pet::with('categories.petType')->find($id)
```

### Filament Admin Resource

**CategoryResource** (`backend/app/Filament/Resources/CategoryResource.php`)

**Navigation:**

- Section: "System" (not Pets)
- Sort order: 2 (after Pet Types with sort 1)
- Icon: Tag icon
- Breadcrumb support

**List View (ListCategories Page):**

- Columns: name, slug, pet_type.name, description, is_approved badge, created_by.name, usage_count
- Sortable: name, usage_count, created_at
- Searchable: name, slug
- Filterable: by pet_type_id, by is_approved status
- Bulk actions: toggle approval (check/uncheck), delete
- Empty state: "No categories yet"

**Create/Edit Form:**

- **Name** (required): TextInput, max 50 chars
- **Pet Type** (required): Select from pet_types, searchable
- **Slug** (read-only): TextInput, displays auto-generated value
- **Description** (optional): Textarea, max 500 chars
- **Is Approved**: Toggle, unlocked only if user has "manage_categories" permission (or is superadmin)
- **Created By** (read-only): Display creator name

**View Page:**

- Display-only read of all fields
- Usage count: shows count of pets using this category
- Breadcrumb navigation

**Permissions Check:**

- Create: requires `manage_categories` permission (or Filament super admin)
- Update: requires `manage_categories` permission
- Delete: requires `manage_categories` permission
- Approve: requires `manage_categories` permission

**Custom Actions:**

- Toggle Approval (on List): Bulk toggle `approved_at` between null and now()
- Preview: Shows how category will appear in frontend

## Frontend Architecture

### Types: Category

Located in `frontend/src/types/pet.ts`

```typescript
export interface Category {
  id: number;
  name: string;
  slug: string;
  pet_type_id: number;
  description?: string;
  created_by?: number;
  approved_at?: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
  pet_type?: PetType;
}

// Pet interface extended with:
export interface Pet {
  // ... existing fields ...
  categories?: Category[];
}

// Create payload includes:
export interface CreatePetPayload {
  // ... existing fields ...
  category_ids?: number[];
}
```

### API Functions

Located in `frontend/src/api/categories.ts`

```typescript
// Fetch categories for a pet type, with optional search
export async function getCategories(params: {
  pet_type_id: number;
  search?: string;
}): Promise<Category[]>;

// Create a new category (user-initiated, requires auth)
export async function createCategory(data: {
  name: string;
  pet_type_id: number;
  description?: string;
}): Promise<Category>;
```

**Example Usage:**

```typescript
// Fetch approved + user's pending categories for dogs
const categories = await getCategories({
  pet_type_id: 2,
  search: "labrador",
});

// Create new category pending approval
const newCategory = await createCategory({
  name: "Service Dog",
  pet_type_id: 2,
  description: "Trained service dog",
});
```

### Component: CategorySelect

Located at `frontend/src/components/pets/CategorySelect.tsx`

**Purpose:** Multi-select autocomplete component for assigning categories to pets during create/edit.

**Props:**

```typescript
interface CategorySelectProps {
  petTypeId: number;
  value?: Category[];
  onChange?: (categories: Category[]) => void;
  disabled?: boolean;
  maxCategories?: number; // default: 10
}
```

**Features:**

- **Dynamic Loading**: Fetches categories from API filtered by pet type
- **Search/Filter**: Real-time input filtering of category names and descriptions
- **Create New**: Inline category creation (sets `created_by` to current user, `approved_at` to null)
- **Approval Badges**: Shows "Pending" badge next to unapproved categories
- **Usage Indicators**: Shows category usage count
- **Max Limit Enforcement**: Prevents adding more than N categories (default 10)
- **Type Safety**: Removes categories that don't match new pet type when switching pet types
- **Loading States**: Shows skeleton while fetching categories
- **Disabled State**: Prevents interaction when disabled prop true

**UI Implementation:**

- Uses official **shadcn/ui Tags** component for consistent styling
- Tags display selected categories with removable badges
- TagsContent dropdown shows available categories with search
- Search input allows filtering and entering new category names
- Pending categories show visual indicator (e.g., ⏳ badge)
- Selected categories show checkmark in dropdown
- Create button appears when search matches no results and user has permission

**Example Usage in Form:**

```tsx
<CategorySelect
  petTypeId={petTypeId}
  value={selectedCategories}
  onChange={updateCategories}
  disabled={isLoading}
/>
```

**Behavior:**

1. User clicks Tags trigger to open dropdown
2. Categories list appears (filtered by pet type)
3. User types to search categories
4. Search results filter in real-time
5. User clicks category to select/deselect
6. If search text doesn't match any category:
   - "Create" button appears
   - Click creates new category with search text as name
   - New category appears in selection with "Pending" badge
7. Selected categories show in Tags above dropdown
8. Click X on tag to remove category

### Form Integration

**useCreatePetForm Hook** - Enhanced with category support:

```typescript
interface CreatePetFormData {
  // ... existing fields ...
  categories: Category[]
  category_ids: number[]
}

// Add category update function
updateCategories(categories: Category[]): void

// Form payload includes category_ids array
```

**CreatePetPage** - Category section:

- CategorySelect appears after Pet Type selection
- In create mode: users can search existing + create new categories
- In edit mode: loads pet's current categories, allows modification
- Validates categories match selected pet type
- On save: sends category_ids to backend

## User Workflows

### As a Pet Owner

**Creating a Pet with Categories:**

1. Open "Create Pet" form
2. Select pet type (e.g., Dog)
3. Available categories auto-filter to dogs only
4. Search for "labrador" → see all matching categories
5. Select "Labrador" from results
6. Select additional categories (e.g., "Large Breed", "Trained")
7. Can create new category on-the-fly if "Shepherd Mix" not in list
8. Submit form - categories assigned to pet
9. View pet profile - categories display with badges

**Adding Categories to Existing Pet:**

1. Edit existing pet
2. CategorySelect shows current categories
3. Remove categories by clicking X
4. Add new categories via search
5. Save changes

### As an Administrator

**Managing Categories:**

1. Navigate to Admin → System → Categories
2. View all categories across all pet types
3. Filter by pet type or approval status
4. Create new category manually (pre-approved)
5. Search for categories
6. Edit category details or approve user-created categories
7. View category usage (how many pets tagged)
8. Bulk approve/disapprove pending categories

**Approval Workflow:**

1. User creates category "Scottish Fold" on frontend
2. Category appears in dropdown with "Pending" badge
3. Category visible only to creator + admins
4. Admin sees in Categories list
5. Admin clicks "Approve" bulk action or toggles approval in edit form
6. `approved_at` set to current timestamp
7. Category now visible to all users for assignment
8. Badge removed from UI

## Testing

**Test Coverage:** `backend/tests/Feature/CategoryTest.php`

18 comprehensive feature tests covering:

- List categories with search and filtering
- Create category with validation
- Category relationships (pet type, pets)
- Approval workflow and visibility
- Usage count accuracy
- Unique constraints (name + pet_type_id)
- Scope functionality
- Pet controller integration

**Run Tests:**

```bash
# Run all category tests
php artisan test --filter CategoryTest

# Run with verbose output
php artisan test --filter CategoryTest -v

# Run specific test
php artisan test --filter test_can_list_categories_by_pet_type
```

**All 18 tests passing** (100% pass rate):

- 49 total assertions verified
- Database state properly isolated via RefreshDatabase
- Seeded data validated

## Permissions & Authorization

**Required Permission for Admin Actions:**

- `manage_categories` - required for admin CRUD
- Assigned via Filament policy or role permission

**Frontend Authorization:**

- Create category: User must be authenticated
- View categories: Public (approved only) + authenticated user (+ pending they created)
- Edit/Delete: Admin only (enforced by Filament)

## Notes & Future Enhancements

### Internationalization (i18n)

- Add `internal_name` field for cross-language consistency
- Example: English "Siamese" maps to Vietnamese "Nước Xiêm"
- Implement translation table for multi-language support

### Category Hierarchy

- Add `parent_id` field to support subcategories
- Example: "Large Breed" → parent "Breed"
- Implement recursive loading for category trees

### Advanced Permissions

- Role-based category creation controls
- Only certain roles can create categories
- Approval permissions by pet type

### Analytics & Reporting

- Track category popularity across platform
- Most-used categories dashboard widget
- Usage trends over time
- Admin recommendations for missing categories

### Bulk Operations

- Import categories from CSV
- Bulk re-approval of categories
- Export categories by pet type

## Troubleshooting

**Issue: "Category not found" error when assigning to pet**

- Verify category ID exists and is approved
- Verify category belongs to selected pet type
- Check if user-created category needs admin approval

**Issue: Duplicate category names appearing**

- Check for unique constraint violations in database
- Verify slug generation is working
- Review CategorySeeder for duplicates

**Issue: Categories not showing in CategorySelect dropdown**

- Verify pet_type_id is correctly passed
- Check user authentication (pending categories need auth)
- Search API endpoint for errors in logs
- Verify categories are approved or created by current user

**Issue: Usage count is incorrect**

- Rebuild attribute cache: `Cache::forget('category_usage_*')`
- Check pet_categories pivot table for orphaned records
- Run database integrity check
