# Requirements Document

## Introduction

This feature implements a flexible invitation system that can be toggled on/off by Super Admins. When active, the system restricts registration to invited users only, while non-invited users can join a waitlist. When disabled, the system allows open registration for all users.

## Requirements

### Requirement 1

**User Story:** As a Super Admin, I want to toggle invite-only registration on/off, so that I can control access to the platform based on current needs.

#### Acceptance Criteria

1. WHEN a Super Admin accesses the admin panel THEN the system SHALL display a toggle for "Enable Invite-Only Registration"
2. WHEN the Super Admin toggles the setting THEN the system SHALL update the global setting immediately
3. WHEN the setting is changed THEN the system SHALL apply the new registration mode to all subsequent registration attempts
4. IF the user is not a Super Admin THEN the system SHALL NOT display the invite-only toggle

### Requirement 2

**User Story:** As a registered user, I want to generate invitation codes, so that I can invite others to join the platform when invite-only mode is active.

#### Acceptance Criteria

1. WHEN a registered user accesses the invitation management page THEN the system SHALL display options to generate new invitations
2. WHEN a user generates an invitation THEN the system SHALL create a unique invitation code
3. WHEN an invitation is created THEN the system SHALL track the inviter, code, and status
4. WHEN a user views their invitations THEN the system SHALL display all sent invitations with their current status

### Requirement 3

**User Story:** As a potential user with an invitation code, I want to register using my invitation, so that I can access the platform when invite-only mode is active.

#### Acceptance Criteria

1. WHEN a user visits the registration page with a valid invitation code THEN the system SHALL display the full registration form
2. WHEN a user completes registration with a valid invitation code THEN the system SHALL create their account successfully
3. WHEN registration is completed with an invitation code THEN the system SHALL mark the invitation as "accepted"
4. IF the invitation code is invalid or already used THEN the system SHALL reject the registration attempt

### Requirement 4

**User Story:** As a potential user without an invitation, I want to join a waitlist when invite-only mode is active, so that I can be notified when I can register.

#### Acceptance Criteria

1. WHEN invite-only mode is active AND a user visits registration without an invitation code THEN the system SHALL display a waitlist signup form
2. WHEN a user submits their email to the waitlist THEN the system SHALL store their email with "pending" status
3. WHEN a user tries to join the waitlist with an already registered email THEN the system SHALL prevent duplicate entries
4. WHEN a user successfully joins the waitlist THEN the system SHALL confirm their submission

### Requirement 5

**User Story:** As a potential user, I want to register freely when invite-only mode is disabled, so that I can access the platform without restrictions.

#### Acceptance Criteria

1. WHEN invite-only mode is disabled THEN the system SHALL display the full registration form to all users
2. WHEN invite-only mode is disabled THEN the system SHALL allow registration without requiring invitation codes
3. WHEN the registration mode changes from invite-only to open THEN existing functionality SHALL remain unaffected

### Requirement 6

**User Story:** As a Super Admin, I want to view and manage waitlist entries, so that I can understand demand and potentially invite waitlisted users.

#### Acceptance Criteria

1. WHEN a Super Admin accesses the waitlist management section THEN the system SHALL display all waitlist entries
2. WHEN viewing waitlist entries THEN the system SHALL show email addresses and submission dates
3. WHEN a Super Admin views the waitlist THEN the system SHALL display entry status (pending, invited)
4. IF a user is not a Super Admin THEN the system SHALL NOT allow access to waitlist management

### Requirement 7

**User Story:** As a system, I want to maintain consistent settings across all components, so that the invite-only mode works reliably throughout the application.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL load the current invite-only setting from persistent storage
2. WHEN the invite-only setting is accessed THEN the system SHALL use cached values for performance
3. WHEN the invite-only setting changes THEN the system SHALL update the cache immediately
4. WHEN multiple requests check the setting simultaneously THEN the system SHALL return consistent values

### Requirement 8

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that users have a smooth experience regardless of system state.

#### Acceptance Criteria

1. WHEN an invitation code is used multiple times THEN the system SHALL only allow the first successful registration
2. WHEN a user tries to generate invitations while not authenticated THEN the system SHALL require authentication
3. WHEN the database is unavailable THEN the system SHALL handle errors gracefully and inform users appropriately
4. WHEN invalid data is submitted to any endpoint THEN the system SHALL validate input and return clear error messages