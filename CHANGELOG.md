# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Pet Sex Field**:
  - Added `sex` field to Pet model with options: Male, Female, and Not Specified (default)
  - Sex field available in pet creation (`/pets/create`) and edit (`/pets/:id/edit`) forms
  - Sex displayed on pet profile page (`/pets/:id`) and pet cards
  - Sex field shown only when value is not "Not Specified" (Male/Female displayed)
  - Database migration adds `sex` column with default value `'not_specified'`
  - Backend enum `PetSex` with label() method for human-readable labels
  - Admin panel (Filament) includes sex field in pet form and table with color-coded badges
  - API endpoints updated to accept and return sex field
  - Factory and seeders updated to include sex values

- **Pet Categories System**:

  - Category model for tagging pets with breed, type, and other characteristics
  - Categories are pet-type-specific (cats have different categories than dogs)
  - Dual-mode creation: administrators create via admin panel, users create on-demand during pet creation/editing
  - Approval workflow: user-created categories require admin approval before general visibility
  - API endpoints: `GET /api/categories` (search/filter) and `POST /api/categories` (create)
  - Admin panel at Admin → System → Categories with full CRUD, bulk approval actions, and usage tracking
  - CategorySelect React component with autocomplete, search, and inline category creation
  - Multi-select support with max 10 categories per pet
  - "Pending" badge indicator for unapproved categories
  - Comprehensive database schema with unique constraints and pivot table for pet-category relationships
  - 30+ pre-seeded categories for cats and dogs (all approved)
  - Full feature test coverage (18 tests, 49 assertions, all passing)
  - Comprehensive documentation at `/docs/categories.md`

- **Standardized Location Fields**:

  - Pet and HelperProfile models now use consistent location fields: Country (required), State, City, and Address (optional)
  - Country field uses ISO 3166-1 alpha-2 codes (2-character country codes, e.g., 'VN' for Vietnam)
  - New `CountrySelect` component with searchable dropdown featuring all countries (using `i18n-iso-countries` package)
  - Vietnam set as default country in pet creation form
  - Pet location display shows formatted "City, State, Country" on profile pages
  - Email templates updated to display structured location format

- **Placement Terms & Conditions System**:

  - New placement terms document stored in `backend/resources/markdown/placement-terms.md`
  - API endpoint `GET /api/legal/placement-terms` to serve terms with version tracking
  - PlacementTermsDialog component displaying terms in a scrollable modal
  - PlacementTermsLink component for easy inline access to full terms
  - Mandatory checkbox in Placement Request modal requiring users to accept terms before submission
  - Comprehensive terms covering authorization, information accuracy, health disclosure, liability, and legal compliance
  - Version dating based on file modification time with 1-hour HTTP cache

- **Placement Request Enhancements**:

  - Public profile visibility warning checkbox - users must acknowledge pet profile will become publicly visible
  - Date validation: Pick-up date cannot be in the past (today is allowed)
  - Date validation: Drop-off date must be on or after pick-up date
  - Calendar components now disable invalid dates (past dates for pick-up, dates before pick-up for drop-off)
  - Validation error messages displayed below date fields when invalid dates are selected
  - Submit button disabled when dates are invalid or required checkboxes not accepted

- **Medical Records feature**: Full CRUD functionality for pet medical records
  - Backend API endpoints for creating, reading, updating, and deleting medical records
  - Support for record types: vaccination, vet visit, medication, treatment, and other
  - Optional fields for vet name and attachment URL
  - Medical Records section on Pet Profile page (view mode) and Pet Profile Edit page (edit mode)
  - Card-based UI consistent with other health sections (Weight History, Vaccinations)
  - Icon buttons (Pencil for edit, Trash for delete) in edit mode
  - Filtering and sorting by date (most recent first)
  - Color-coded badges for different record types
- Pet photo gallery with carousel on edit pet page - view all uploaded photos in a thumbnail grid.
- Full-size photo modal with carousel navigation for viewing pet photos.
- "Set as Avatar" button in photo modal to choose which photo is the pet's avatar.
- "Delete" button in photo modal to remove individual photos.
- Star badge on primary photo thumbnail to indicate current avatar.
- Newly uploaded photos are automatically set as the pet's primary photo.

### Changed

- **Pet Model Schema**:
  - Removed `breed` field from Pet model (replaced by Categories system for more flexible tagging)
  - Pet breed information can now be stored using the Categories system (e.g., "Siamese", "Persian" categories)
  - Pet profile displays now show pet type name instead of breed
  - Database migration removes `breed` column from pets table
  - API endpoints no longer accept or return breed field
  - Admin panel (Filament) removed breed field from pet form and table

- **Placement Request Display Refactor**:

  - PlacementRequestsSection now uses improved card-based styling with badges for request types
  - Request types formatted as human-readable labels: "Foster (Free)", "Foster (Paid)", "Permanent Adoption"
  - Request type badges color-coded: default for permanent, secondary for fostering, outline for others
  - Response count displayed with Users icon showing number of pending responses
  - Expiration date displayed with Clock icon for better visual hierarchy
  - Delete button changed to ghost icon button with Trash icon for cleaner design
  - Improved spacing and visual consistency across request cards

- **Helper Profiles Page Redesign**:

  - Changed from table layout to modern card-based design matching app's design system
  - Added back button navigation consistent with other pages
  - Location displayed with MapPin icon showing "City, State" format
  - Public/Private status shown as badges with Eye/EyeOff icons
  - Edit button changed to ghost icon button with Pencil icon
  - Improved loading and error states using LoadingState and ErrorState components
  - Empty state with call-to-action button when no profiles exist
  - Better responsive layout on mobile devices

- **Placement Response Section Styling**:
  - ResponseSection now uses card-based styling with improved visual hierarchy
  - Helper profile displayed with user avatar placeholder and User icon
  - "View Profile" button now includes Eye icon for clarity
  - Responsive button layout (stacks on mobile, inline on desktop)
  - PlacementResponseSection updated with matching card styling
  - Request type displayed as badge in header for visual consistency
  - Pending state shows Clock icon with descriptive text
  - Cancel button includes X icon for better usability
- Entire pet card is now clickable to navigate to pet profile page (previously only photo was clickable).
- Vaccination status badge on pet cards showing "Up to date", "Due soon", "Overdue", or "No records" (for pet types that support vaccinations).
- Placement Requests now displayed in a Card component on Pet Profile page for consistency with other sections.

### Changed

- **Placement Request Modal Labels**: "Start Date" renamed to "Pick-up Date" and "End Date" renamed to "Drop-off Date" for clarity (database field names unchanged)
- Replaced "Meo!" text with Cat icon in the top navigation bar.
- Replaced "Requests" text with PawPrint icon in the top navigation bar.
- Section order on Pet Profile Edit page: Weight History now appears before Vaccinations.
- "Add New Weight Entry" button now shows in both view and edit modes.
- Placement Requests button text changed to "+ Add Placement Request" for consistency.

### Fixed

- Pet photos now display correctly immediately after upload (fallback to original when conversions aren't ready).
- Date picker now includes year and month dropdowns for easier selection of past dates.
- Description and location fields are now optional when creating a pet (can be added later in edit mode).
- Medical records table migration added `pet_id` foreign key column.

### Changed

- **Pet Location Structure**: Replaced single `location` text field with structured `country`, `state`, `city`, and `address` fields
- **HelperProfile Location Fields**: Made `state`, `city`, `address`, and `zip_code` fields optional (previously some were required)
- Description and location fields are hidden from pet creation form (accessible via edit page).
