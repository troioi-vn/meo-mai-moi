# CHANGELOG

All notable changes to this project are documented here, following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Helper handover guidance**:
  - Acceptance notification now links helpers directly to the public pet page (`/pets/:id/public`) where they can confirm the handover.

### Changed

- **Requests page visibility**:

  - Pets stay visible on the `/requests` page when their placement requests are in progress (`fulfilled`, `pending_transfer`, `active`, `finalized`) so accepted helpers can still access the public pet page and continue the flow.

- **Placement Request Auto-Rejection Timing**:
  - Moved auto-rejection of other pending helper offers from the "Accept Response" step to the "Complete Handover" step
  - Previously: Other offers were rejected when the owner accepted a response (PlacementRequest → `fulfilled`)
  - Now: Other offers remain pending until the handover is completed and status changes to `active` (fostering) or `finalized` (permanent rehoming)
  - This provides a backup option if the initially selected helper doesn't complete the handover
  - Rejected helpers are notified only when the transfer is actually confirmed

### Fixed

- **Temporary fostering no longer transfers ownership**:
  - Handover completion now keys off `placement_request.request_type` (canonical) to decide between permanent vs fostering flows
  - Temporary fostering (`foster_free` / `foster_payed`) keeps the pet owner unchanged, creates/ensures a foster assignment, and sets placement status to `active`
  - Permanent rehoming still transfers ownership, closes prior ownership history, and finalizes the placement
  - Admin pet view continues to show the original owner for temporary fostering cases

### Added

- **Per-Pet Viewer/Editor Access Lists**:

  - Pets now support explicit “Users who can see this pet” and “Users who can edit this pet” lists
  - Backed by new pivot tables `pet_viewers` and `pet_editors` with model relationships and policy updates
  - Create/Update pet APIs accept `viewer_user_ids` and `editor_user_ids` to manage these lists
  - Filament pet form exposes multi-selects for viewers and editors
  - Tests: `PetViewerEditorAccessTest` covers creation, viewing, and editing permissions

- **Placement Response Modal Improvements**:

  - Removed "Relationship Type" dropdown - now automatically derived from placement request type
  - Auto-prefill "Helper Profile" dropdown when user has only one profile
  - Added validation to compare request type against helper profile's allowed request types
    - Shows destructive warning if type is not allowed and disables Submit button
  - Added location validation warnings:
    - City mismatch: Shows warning (non-blocking)
    - Country mismatch: Shows serious/destructive warning (non-blocking)
  - Automatically derive fostering type and price requirements from placement request type:
    - `foster_payed` → Fostering with "Paid" type (requires price input)
    - `foster_free` → Fostering with "Free" type
    - `permanent` → Permanent Foster

- **Placement Request Status Flow Enhancement**:

  - Implemented complete status lifecycle for placement requests:
    - `open` → `fulfilled` (when Owner accepts Helper's response)
    - `fulfilled` → `pending_transfer` (when Helper clicks "Confirm Rehoming")
    - `pending_transfer` → `finalized` (for permanent rehoming) OR `active` (for temporary fostering)
    - `active` → `finalized` (when Owner clicks "Pet is Returned" for temporary fostering)
  - Added "Confirm Rehoming" button for Helpers on public pet profile pages when their response is accepted
  - Added "Pet is Returned" button for Owners on pet profile pages for active temporary fostering
  - Updated `CompleteHandoverController` to properly set PlacementRequest status based on rehoming type
  - New `FinalizePlacementRequestController` endpoint: `POST /api/placement-requests/{id}/finalize`
  - Status badges and visual indicators throughout the UI showing current placement request state
  - Comprehensive status flow documentation updated in `docs/rehoming-flow.md`

- **Helper Profile Pages UI Modernization**:

  - Updated `HelperProfilePage` (list view) with modern card-based design matching Pet Profile patterns
  - Updated `HelperProfileViewPage` with consistent navigation, status badges, and organized card sections
  - Updated `CreateHelperProfilePage` and `HelperProfileEditPage` with consistent navigation headers
  - Improved empty states, loading states, and error handling across all helper profile pages
  - Better visual hierarchy with icons, badges, and consistent spacing

- **Helper Profile Request Types & Visibility**:

  - Removed legacy boolean fields `is_public`, `can_foster`, and `can_adopt` from helper profiles.
  - Added new `request_types` array field on `helper_profiles` backed by the `PlacementRequestType` enum (`foster_payed`, `foster_free`, `permanent`).
  - Enforced validation so that helper profiles must have at least one `request_type` selected on create and update.
  - Updated backend model, controllers, factories, policies, Filament resource, and API schema to use `request_types`.
  - Updated frontend types, forms, pages, and tests to surface `request_types` as selectable chips/badges.
  - Implemented visibility rules for helper profiles:
    - Owners can always view their own helper profiles.
    - Pet owners can view helper profiles that have responded to their placement requests (via transfer requests linked to their pets).
    - Admins can view all helper profiles.
  - Updated helper profile listing and show endpoints to respect the new visibility logic.

- **Contact Info Field for Helper Profiles**:

  - Added new `contact_info` multiline text field to helper profiles, positioned after the phone number field
  - Helpers can add additional contact information (e.g., Telegram, Zalo, WhatsApp, preferred contact times)
  - Field includes a help icon with tooltip explaining that this info and phone number will be visible to pet owners when responding to placement requests
  - Contact info is displayed in:
    - Helper profile view page
    - Helper profile dialog (shown to pet owners when reviewing placement responses)
  - Database migration adds nullable `contact_info` text column to `helper_profiles` table
  - Backend validation allows up to 1000 characters
  - Updated documentation: new `docs/helper-profiles.md` with complete field reference

- **Public Pet Profile Endpoint and UI**:

  - New `/api/pets/{id}/public` endpoint for accessing pet profiles publicly (for guests and non-owners)
  - Public profiles are accessible for:
    - Pets with status "lost" (always publicly viewable)
    - Pets with active (OPEN) placement requests
  - Whitelisted fields returned in public view: id, name, sex, birthday data, location (no exact address), description, status, pet type, categories, photos, placement requests, and viewer permissions
  - New `ShowPublicPetController.php` backend controller implementing public profile access with field filtering
  - New `PetPolicy::isPubliclyViewable()` method determining public visibility logic
  - New frontend routes and components:
    - Route `/pets/:id/public` for public pet profile page (`PetPublicProfilePage.tsx`)
    - `PublicPlacementRequestSection.tsx` component for displaying placement requests on public profiles
    - Automatic redirect from `/pets/:id` to `/pets/:id/public` for non-owners viewing publicly viewable pets
  - Owner viewing their own public profile sees banner: "You are viewing the public profile of your pet."
  - Lost pets show warning banner: "This pet has been reported as lost..."
  - Comprehensive documentation: new `docs/pet-profiles.md` explaining access control, routing logic, and API endpoints
  - Test coverage: `PublicPetProfileTest.php` and `PetPublicProfilePage.test.tsx` with 13+ test cases

- **Login Prompt for Placement Requests**:

  - "Respond" button on pet cards is now visible to all users (not just logged-in users)
  - Non-authenticated users clicking "Respond" see a modal with "Please login to respond" message
  - Modal includes "Login" and "Cancel" buttons
  - "Login" button redirects to login page with return URL parameter (`/login?redirect=/pets/:id`)
  - After successful login, users are automatically redirected back to the pet profile page
  - Existing login redirect functionality already supported this pattern with security validation

- **Enhanced Filters on Requests Page**:

  - Added **Request Type filter** with options: All Request Types, Foster (Paid), Foster (Free), Permanent
  - Added **Country filter** dynamically populated from available pets, sorted alphabetically with human-readable country names
  - Improved **date filters** with comparison operators:
    - Renamed "Start Date" to "Pickup Date" and "End Date" to "Drop-off Date"
    - Added comparison select dropdowns (Before/On/After) for both pickup and drop-off dates
    - Pickup Date filters on `placement_request.start_date` field
    - Drop-off Date filters on `placement_request.end_date` field
    - Drop-off Date filter is automatically hidden when "Permanent" request type is selected
  - Filters are organized in a cleaner two-row layout for better usability

- **Logout confirmation in Main Menu**:
  - Clicking "Log Out" from the user avatar menu opens a confirmation dialog with "Cancel" and "Log Out" actions
  - Confirming the action logs out the current user and redirects to `/login`; cancelling closes the dialog
  - Frontend: `UserMenu` component now uses `AlertDialog` to display the confirmation
  - Tests: Updated unit tests and e2e tests to assert dialog behavior and logout flow

### Changed

- **Placement Request Status Update**: Replaced `PENDING_REVIEW` status with `FINALIZED`
  - Updated enum `PlacementRequestStatus` in backend
  - Updated all UI labels and filters across Filament admin panel
  - Updated API database queries for active request checks
  - Updated frontend logic for determining active placement requests
  - Affected files:
    - Backend: `PlacementRequestStatus.php`, `PlacementRequestResource.php`, `StorePlacementRequestController.php`, `PlacementRequestExporter.php`
    - Frontend: `PetCard.tsx`, `RequestsPage.tsx`, `usePlacementInfo.ts`

### Fixed

- **Pet Cards Visibility on Requests Page**:

  - Made `/api/pet-types` endpoint public so non-logged-in users can view Pet Cards on the `/requests` page
  - Previously, the endpoint was protected by `auth:sanctum` middleware, causing the page to fail for unauthenticated users
  - Moved `/api/pet-types` route to public routes section to allow access without authentication

- **Pet Profile Page Visibility for Non-Logged-In Users**:
  - Made pet health data endpoints (medical records, vaccinations, weights, medical notes, microchips) publicly readable
  - GET endpoints now use `optional.auth` middleware, allowing non-logged-in users to view pet profiles without errors
  - Write operations (POST/PUT/DELETE) still require authentication
  - Previously, visiting `/pets/:id` as a non-logged-in user showed "Failed to load medical records" error

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
