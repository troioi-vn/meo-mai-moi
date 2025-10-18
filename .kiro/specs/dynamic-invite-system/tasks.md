# Implementation Plan

- [x] 1. Set up database schema and models
  - Create migration for settings table with key-value structure
  - Create migration for invitations table with user relationships and status tracking
  - Create migration for waitlist_entries table with email and status fields
  - _Requirements: 7.1, 7.2_

- [x] 1.1 Create Settings model and basic functionality
  - Implement Settings model with get/set static methods
  - Add caching functionality for performance optimization
  - Create database seeder for initial invite_only_enabled setting
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 1.2 Create Invitation model with relationships
  - Implement Invitation model with User relationships
  - Add code generation and validation methods
  - Implement status management (pending, accepted, expired)
  - _Requirements: 2.2, 2.3, 3.1, 3.3_

- [x] 1.3 Create WaitlistEntry model
  - Implement WaitlistEntry model with email validation
  - Add status management and scopes for filtering
  - Implement unique email constraint handling
  - _Requirements: 4.2, 4.3_

- [x] 2. Implement core service classes
  - Create SettingsService for centralized settings management
  - Create InvitationService for invitation lifecycle management
  - Create WaitlistService for waitlist operations
  - _Requirements: 7.1, 2.1, 4.1_

- [x] 2.1 Implement SettingsService with caching
  - Write methods for getting/setting invite-only status
  - Add public settings endpoint support
  - _Requirements: 7.3, 7.4, 5.1_

- [x] 2.2 Implement InvitationService functionality
  - Write invitation generation with unique code creation
  - Implement invitation validation and acceptance logic
  - Add cleanup methods for expired invitations
  - _Requirements: 2.2, 2.3, 3.1, 3.3, 8.1_

- [x] 2.3 Implement WaitlistService operations
  - Write waitlist entry creation with duplicate prevention
  - Implement pending entry retrieval methods
  - Add waitlist-to-invitation conversion functionality
  - _Requirements: 4.2, 4.3, 6.3_

- [x] 3. Create API endpoints and controllers
  - Create WaitlistController for public waitlist signup
  - Create InvitationController for authenticated invitation management
  - Create SettingsController for public settings access
  - Modify AuthController to support invitation-based registration
  - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [x] 3.1 Implement WaitlistController
  - Write POST endpoint for waitlist email submission
  - Add validation for email format and uniqueness
  - Implement error handling for duplicate entries
  - _Requirements: 4.2, 4.3, 8.4_

- [x] 3.2 Implement InvitationController
  - Write POST endpoint for invitation generation
  - Write GET endpoint for user's invitation list
  - Add DELETE endpoint for invitation revocation
  - _Requirements: 2.1, 2.4, 8.2_

- [x] 3.3 Create public SettingsController
  - Write GET endpoint for public settings (invite-only status)
  - Implement caching headers for performance
  - Add error handling for service unavailability
  - _Requirements: 5.1, 7.4, 8.3_

- [x] 3.4 Modify AuthController registration logic
  - Update register method to check invite-only setting
  - Add invitation code validation when required
  - Implement invitation acceptance on successful registration
  - _Requirements: 3.1, 3.2, 3.3, 5.2_

- [x] 4. Create Filament admin resources
  - Create custom SettingsResource page for Super Admin toggle
  - Create WaitlistResource for waitlist management
  - Create InvitationResource for system oversight
  - _Requirements: 1.1, 1.4, 6.1, 6.4_

- [x] 4.1 Implement SettingsResource custom page
  - Create custom Filament page with invite-only toggle
  - Add Super Admin role restriction
  - Implement real-time setting updates
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 4.2 Create WaitlistResource
  - Implement table view with email and date columns
  - Add bulk actions for inviting waitlisted users
  - Create filters for entry status
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.3 Create InvitationResource for admin oversight
  - Implement table view of all system invitations
  - Add actions for revoking invitations
  - Create cleanup actions for expired invitations
  - _Requirements: 2.4, 8.1_

- [x] 5. Update frontend registration page
  - Modify registration page to handle three distinct states
  - Add waitlist signup form component
  - Implement invitation code validation
  - Add dynamic state management based on system settings
  - _Requirements: 3.1, 4.1, 5.1, 5.2_

- [x] 5.1 Implement registration page state management
  - Write logic to fetch invite-only status on page load
  - Add URL parameter detection for invitation codes
  - Implement conditional rendering for different registration modes
  - _Requirements: 5.1, 5.2, 3.1_

- [x] 5.2 Create waitlist signup form component
  - Write form component for email submission
  - Add validation and error handling
  - Implement success confirmation messaging
  - _Requirements: 4.1, 4.4, 8.4_

- [x] 5.3 Update registration form for invitation codes
  - Modify existing registration form to accept invitation codes
  - Add invitation validation feedback
  - Implement error handling for invalid codes
  - _Requirements: 3.1, 3.4, 8.4_

- [x] 6. Create invitation management page
  - Build dashboard page for invitation generation and tracking
  - Add invitation link copying functionality
  - Implement invitation status display
  - _Requirements: 2.1, 2.4_

- [x] 6.1 Implement invitation dashboard
  - Create page layout with invitation generation form
  - Add table for displaying sent invitations with status
  - Implement real-time status updates
  - _Requirements: 2.1, 2.4_

- [x] 6.2 Add invitation link management
  - Write functionality for copying invitation links
  - Add QR code generation for invitations
  - Implement invitation revocation controls
  - _Requirements: 2.4_

- [x] 7. Write comprehensive tests
  - Create unit tests for all service classes
  - Write feature tests for API endpoints
  - Add frontend component tests
  - Write integration tests for complete user flows
  - _Requirements: All requirements validation_

- [x] 7.1 Write backend unit tests
  - Test SettingsService caching and retrieval methods
  - Test InvitationService code generation and validation logic
  - Test WaitlistService email handling and deduplication
  - Test model relationships and validation rules
  - _Requirements: 7.1, 2.2, 4.2_

- [x] 7.2 Write backend feature tests
  - Test API endpoints with various scenarios (success, validation errors, rate limiting)
  - Test authentication and authorization for protected endpoints
  - Test registration flow with different invite-only modes
  - Test invitation lifecycle (generate, validate, accept, revoke)
  - Test waitlist functionality (join, duplicate prevention, admin actions)
  - _Requirements: 8.2, 8.3, 8.4, 3.1, 4.1, 5.1_

- [x] 7.3 Write frontend component tests
  - Test WaitlistForm component (form submission, validation, success states)
  - Test RegisterForm component with invitation codes
  - Test RegisterPage dynamic mode switching
  - Test InvitationsPage dashboard functionality
  - Test useInviteSystem hook state management
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [x] 8. Add API routes and middleware
  - Register all new API routes with appropriate middleware
  - Add rate limiting for invitation generation and waitlist signup
  - Implement proper authentication guards
  - _Requirements: 8.2, 8.4_

- [x] 8.1 Configure API routes
  - Add public routes for waitlist and settings
  - Add authenticated routes for invitation management
  - Configure route model binding for invitations
  - _Requirements: 2.1, 4.1, 8.2_

- [x] 8.2 Implement rate limiting and security
  - Add rate limiting middleware to prevent abuse
  - Implement CSRF protection where appropriate
  - Add input sanitization and validation
  - _Requirements: 8.2, 8.4_

- [x] 9. Integration and final testing
  - Test complete system integration
  - Verify all three registration modes work correctly
  - Test admin panel functionality end-to-end
  - Validate performance under load
  - _Requirements: All requirements_

- [x] 9.1 System integration testing
  - Test switching between invite-only and open registration
  - Verify invitation codes work across system state changes
  - Test waitlist functionality with admin actions
  - _Requirements: 1.1, 1.3, 2.1, 4.1, 5.1_

- [x] 9.2 Performance and security validation
  - Test caching effectiveness under load
  - Verify rate limiting prevents abuse
  - Test database performance with large datasets
  - _Requirements: 7.3, 7.4, 8.2_

- [x] 10. Create email templates and notifications
  - Design invitation email template with clear call-to-action
  - Create waitlist confirmation email template
  - Implement email notification system for invitations
  - _Requirements: 2.1, 4.4_

- [x] 10.1 Design and implement invitation email template
  - Create Blade template for invitation emails
  - Add personalized invitation links and messaging
  - Implement email styling consistent with application branding
  - _Requirements: 2.1, 2.4_

- [x] 10.2 Create waitlist confirmation email
  - Design email template for waitlist signup confirmation
  - Add unsubscribe functionality for waitlist emails
  - Implement email queue integration
  - _Requirements: 4.4_

- [x] 11. Add OpenAPI documentation
  - Create OpenAPI annotations for all new API endpoints
  - Update existing registration endpoint documentation
  - Add request/response schemas for invitation and waitlist models
  - Generate updated API documentation
  - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [x] 11.1 Document new API endpoints
  - Add OpenAPI annotations to WaitlistController endpoints
  - Add OpenAPI annotations to InvitationController endpoints
  - Add OpenAPI annotations to SettingsController endpoints
  - _Requirements: 2.1, 4.1, 5.1_

- [x] 11.2 Update registration endpoint documentation
  - Modify existing AuthController register endpoint annotations
  - Add invitation_code parameter documentation
  - Update response schemas for different registration modes
  - _Requirements: 3.1, 5.2_