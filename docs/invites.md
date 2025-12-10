# Invitation System

## Overview

The invitation system provides a flexible authentication mechanism that allows communities to control user registration. It supports two modes:

1. **Open Registration Mode**: Anyone can register without restrictions
2. **Invite-Only Mode**: New users require an invitation code to register

The system includes a waitlist feature for users when invite-only mode is enabled, email notifications, and comprehensive management tools.

## Key Features

### For Administrators

- Toggle between open and invite-only registration
- Monitor waitlist entries
- View system-wide invitation statistics

### For Users

- Generate invitation codes
- Share invitations via QR code, email, SMS, or direct links
- Manage sent invitations (view status, revoke pending invitations)
- Track invitation acceptance

### For New Users

- Join waitlist when registration is restricted
- Register with valid invitation codes
- Receive clear messaging about registration requirements

## Architecture

### Backend Components

#### Models

- **`Invitation`** (`backend/app/Models/Invitation.php`): Core invitation model with relationships to inviter and recipient users
- **`WaitlistEntry`** (`backend/app/Models/WaitlistEntry.php`): Manages users waiting for invitations
- **`Settings`** (`backend/app/Models/Settings.php`): Key-value store for system configuration

#### Services

- **`InvitationService`** (`backend/app/Services/InvitationService.php`): Business logic for invitation generation, validation, and acceptance
- **`WaitlistService`** (`backend/app/Services/WaitlistService.php`): Manages waitlist operations
- **`SettingsService`** (`backend/app/Services/SettingsService.php`): Handles system settings access and caching

#### Controllers

- **`InvitationController`** (`backend/app/Http/Controllers/InvitationController.php`): API endpoints for invitation management
- **`WaitlistController`** (`backend/app/Http/Controllers/WaitlistController.php`): Waitlist join and management
- **`SettingsController`** (`backend/app/Http/Controllers/SettingsController.php`): Public settings endpoint

#### Notifications

- **`InvitationToEmail`** (`backend/app/Notifications/InvitationToEmail.php`): Email notifications for direct invitations
- **`WaitlistConfirmation`** (`backend/app/Notifications/WaitlistConfirmation.php`): Confirmation emails for waitlist entries

#### Database

- **Migrations**:
  - `create_invitations_table.php` - Stores invitation codes and status
  - `create_waitlist_entries_table.php` - Manages waitlist
  - `create_settings_table.php` - System configuration

### Frontend Components

#### API Layer

- **`invite-system.ts`** (`frontend/src/api/invite-system.ts`): TypeScript API client for all invitation endpoints

#### Components

- **`WaitlistForm`** (`frontend/src/components/WaitlistForm.tsx`): Join waitlist form
- **`InvitationShare`** (`frontend/src/components/InvitationShare.tsx`): Share invitations via multiple channels
- **`InvitationQRCode`** (`frontend/src/components/InvitationQRCode.tsx`): Generate and download QR codes

#### Pages

- **`InvitationsPage`** (`frontend/src/pages/invitations/InvitationsPage.tsx`): Dashboard for managing invitations

#### Hooks

- **`useInviteSystem`** (`frontend/src/hooks/use-invite-system.ts`): React hook for registration mode detection

## API Endpoints

### Public Endpoints

#### Get Public Settings

```http
GET /api/settings/public
```

**Response:**

```json
{
  "data": {
    "invite_only_enabled": false
  }
}
```

#### Join Waitlist

```http
POST /api/waitlist
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "email": "user@example.com",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

- `409 Conflict` - Email already on waitlist or registered
- `422 Unprocessable Entity` - Validation errors

#### Validate Invitation Code

```http
POST /api/invitations/validate
Content-Type: application/json

{
  "code": "abc123xyz"
}
```

**Response:**

```json
{
  "data": {
    "valid": true,
    "inviter": {
      "name": "John Doe"
    },
    "expires_at": null
  }
}
```

### Authenticated Endpoints

#### Generate Invitation

```http
POST /api/invitations
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "recipient@example.com",  // optional
  "expires_at": "2024-12-31T23:59:59Z"  // optional
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": 1,
    "code": "abc123xyz",
    "status": "pending",
    "expires_at": null,
    "invitation_url": "https://example.com/register?invitation_code=abc123xyz",
    "created_at": "2024-01-01T00:00:00Z",
    "recipient": null
  }
}
```

**Rate Limiting:** Limited to 10 invitations per user per day

#### List User Invitations

```http
GET /api/invitations
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "code": "abc123xyz",
      "status": "pending",
      "expires_at": null,
      "invitation_url": "https://example.com/register?invitation_code=abc123xyz",
      "created_at": "2024-01-01T00:00:00Z",
      "recipient": null
    },
    {
      "id": 2,
      "code": "def456abc",
      "status": "accepted",
      "expires_at": null,
      "invitation_url": "https://example.com/register?invitation_code=def456abc",
      "created_at": "2024-01-02T00:00:00Z",
      "recipient": {
        "id": 2,
        "name": "Jane Doe",
        "email": "jane@example.com"
      }
    }
  ]
}
```

#### Revoke Invitation

```http
DELETE /api/invitations/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "data": []
}
```

**Error Responses:**

- `404 Not Found` - Invitation not found or cannot be revoked

#### Get Invitation Statistics

```http
GET /api/invitations/stats
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": {
    "total": 10,
    "pending": 3,
    "accepted": 5,
    "expired": 1,
    "revoked": 1
  }
}
```

## Registration Integration

### Authentication Flow

The invitation system integrates with the registration process through the `RegisterRequest` validation:

```php
// When invite-only mode is enabled
if (Settings::isInviteOnlyEnabled()) {
    $rules['invitation_code'] = ['required', new ValidInvitationCode()];
}
```

### Frontend Registration Detection

The `useInviteSystem` hook automatically detects the registration mode:

```typescript
const { mode, invitationCode, invitationValidation, error } = useInviteSystem();

// mode can be:
// - 'open-registration': Anyone can register
// - 'invite-only-no-code': Restricted, show waitlist
// - 'invite-only-with-code': Restricted with valid code
```

### Registration Modes

#### Open Registration Mode

- Standard registration form
- Optional invitation code can still be provided
- No restrictions on new users

#### Invite-Only Mode (No Code)

- Registration form is hidden
- Waitlist form is displayed prominently
- Clear messaging about registration requirements
- Users can request invitations from existing members

#### Invite-Only Mode (With Valid Code)

- Registration form is displayed
- Invitation code is pre-filled from URL parameter
- Shows inviter information
- Validates code before allowing registration

## Email Notifications

### Invitation Email

Sent when a user generates an invitation to a specific email address:

**Subject:** You're invited to join Meo Mai Moi!

**Content:**

- Personalized greeting with inviter name
- Call-to-action button with invitation link
- Invitation code for manual entry
- Expiration information (if applicable)

### Waitlist Confirmation Email

Sent when a user joins the waitlist:

**Subject:** You're on the waitlist!

**Content:**

- Confirmation of waitlist entry
- What to expect next
- Alternative options (ask existing members)

### Email Templates

Custom email templates are located in:

- `backend/resources/views/vendor/mail/html/` - HTML templates
- `backend/resources/views/vendor/mail/text/` - Plain text templates

## Configuration

### Environment Variables

```bash
# Enable invite-only mode (default: false)
INVITE_ONLY_ENABLED=false

# Email configuration for notifications
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Settings Management

Settings are stored in the `settings` table and cached for performance:

```php
// Get setting
$inviteOnly = Settings::get('invite_only_enabled', 'false');

// Set setting
Settings::set('invite_only_enabled', 'true');

// Toggle setting
$newValue = Settings::toggle('invite_only_enabled');

// Helper method
$isEnabled = Settings::isInviteOnlyEnabled();
```

### Rate Limiting

Invitation generation is rate-limited to prevent abuse:

- **User limit**: 10 invitations per day
- **Endpoint throttle**: Standard API rate limits apply

## Testing

### Backend Tests

#### Feature Tests

- **`InvitationControllerTest`**: API endpoint testing
- **`InviteSystemAuthTest`**: Registration flow with invitations
- **`InviteSystemIntegrationTest`**: End-to-end workflows
- **`SettingsControllerTest`**: Public settings endpoint
- **`WaitlistControllerTest`**: Waitlist management

#### Unit Tests

- **`InvitationServiceTest`**: Service layer logic
- **`InvitationTest`**: Model behavior and scopes
- **`SettingsTest`**: Settings model methods
- **`SettingsServiceTest`**: Service layer caching
- **`WaitlistEntryTest`**: Model validation
- **`WaitlistServiceTest`**: Waitlist operations

#### Running Tests

```bash
cd backend
./vendor/bin/phpunit --testsuite=Feature --filter=Invitation
./vendor/bin/phpunit --testsuite=Unit --filter=Invitation
```

### Frontend Tests

#### Component Tests

- **`WaitlistForm.test.tsx`**: Waitlist form behavior
- **`InvitationQRCode.test.tsx`**: QR code generation
- **`InvitationShare.test.tsx`**: Share functionality

#### Page Tests

- **`InvitationsPage.test.tsx`**: Invitation management UI

#### Hook Tests

- **`use-invite-system.test.ts`**: Registration mode detection

#### Running Tests

```bash
cd frontend
npm run test
```

## User Workflows

### Workflow 1: User Joins Waitlist and Gets Invited

1. **User visits registration page**

   - System detects invite-only mode is enabled
   - Waitlist form is displayed

2. **User joins waitlist**

   - Enters email address
   - Receives confirmation email
   - Status: "pending"

3. **Existing user invites from waitlist**

   - Navigates to invitations page
   - Generates invitation for waitlist email
   - System sends invitation email
   - Waitlist status changes to "invited"

4. **User registers with invitation**
   - Clicks link in email
   - Registration form appears with code pre-filled
   - Completes registration
   - Invitation status changes to "accepted"

### Workflow 2: Direct Invitation

1. **User generates invitation**

   - Navigates to invitations page
   - Clicks "Generate Invitation"
   - Receives invitation link

2. **User shares invitation**

   - Copies link directly
   - Or shares via QR code
   - Or sends via email/SMS through share dialog

3. **Recipient registers**
   - Opens invitation link
   - Completes registration
   - Invitation is marked as accepted

### Workflow 3: Open Registration with Optional Invitation

1. **User visits registration page**

   - Normal registration form is displayed
   - No invitation code required

2. **User optionally uses invitation code**
   - Enters invitation code (optional)
   - Registration proceeds normally
   - If code is provided, it's tracked

## Security Considerations

### Invitation Code Generation

- Codes are 32-character random strings
- Uniqueness is enforced at database level
- Codes are non-sequential and unpredictable

### Validation Rules

- Invitation codes must be pending status
- Codes must not be expired
- Each code can only be used once
- Users can only revoke their own invitations

### Rate Limiting

- Invitation generation limited per user
- API endpoints have standard throttling
- Waitlist submissions are rate-limited

### Authorization

- Only authenticated users can generate invitations
- Users can only view and manage their own invitations
- Public endpoints only expose necessary information

### Data Protection

- Email addresses in waitlist are validated
- Sensitive data is not exposed in public endpoints
- Settings cache is cleared on updates

## Troubleshooting

### Common Issues

#### Invitation Codes Not Working

**Symptoms:** Invalid code error during registration

**Solutions:**

1. Check invitation status (must be "pending")
2. Verify expiration date hasn't passed
3. Ensure invite-only mode is actually enabled
4. Clear settings cache: `php artisan cache:clear`

#### Emails Not Sending

**Symptoms:** No confirmation emails received

**Solutions:**

1. Verify mail configuration in `.env`
2. Check mail logs: `storage/logs/laravel.log`
3. Test mail connection: `php artisan tinker`
   ```php
   Mail::raw('Test', function($msg) {
       $msg->to('test@example.com')->subject('Test');
   });
   ```

#### Frontend Not Detecting Invite Mode

**Symptoms:** Wrong form displayed

**Solutions:**

1. Check `/api/settings/public` endpoint response
2. Verify settings in database
3. Clear browser cache and cookies
4. Check console for JavaScript errors

#### Database Issues

**Symptoms:** Migration errors

**Solutions:**

1. Run migrations: `php artisan migrate`
2. Check database connection
3. Verify permissions on settings table

## Future Enhancements

Potential improvements for the invitation system:

1. **Bulk Invitations**: Generate multiple invitations at once
2. **Invitation Templates**: Custom messages for invitations
3. **Invitation Groups**: Tag invitations for organizational purposes
4. **Analytics Dashboard**: Track invitation conversion rates
5. **Automatic Expiration**: Background job to expire old invitations
6. **Invitation Limits**: Per-user invitation quotas
7. **Waitlist Priority**: Allow admins to prioritize waitlist entries
8. **Social Sharing**: Direct integration with social media platforms
9. **Referral Tracking**: Track which users bring in the most new members
10. **Invitation History**: Audit log for invitation activities

## Related Documentation

- [Development Guide](./development.md) - Local setup and development workflow
- [Deployment Guide](./deploy.md) - Production deployment instructions
- [API Documentation](./api.md) - Complete API reference (if available)

## Support

For issues or questions about the invitation system:

1. Check this documentation first
2. Review the test files for usage examples
3. Check the GitHub issues
4. Create a new issue with detailed information
