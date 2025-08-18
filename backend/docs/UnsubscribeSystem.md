# Email Unsubscribe System

## Overview

The email unsubscribe system allows users to opt out of specific types of email notifications while preserving their in-app notification preferences. The system uses secure, tamper-proof tokens to ensure only legitimate unsubscribe requests are processed.

## Components

### UnsubscribeService

The `UnsubscribeService` handles all unsubscribe-related operations:

- **Token Generation**: Creates secure HMAC-SHA256 tokens for unsubscribe links
- **Token Verification**: Validates unsubscribe tokens to prevent tampering
- **URL Generation**: Creates complete unsubscribe URLs for email templates
- **Preference Updates**: Processes unsubscribe requests and updates user preferences

### UnsubscribeController

The `UnsubscribeController` provides both web and API endpoints:

- **GET /unsubscribe**: Displays the unsubscribe confirmation page
- **POST /api/unsubscribe**: Processes unsubscribe requests via API

### Email Template Integration

All email templates automatically include unsubscribe links through the base layout:

```blade
<a href="{{ $unsubscribeUrl }}">Unsubscribe from this notification type</a>
```

The `$unsubscribeUrl` variable is automatically provided by the `NotificationMail` base class.

## Security Features

### Token-Based Authentication

- Uses HMAC-SHA256 with the application key as the secret
- Tokens are specific to user ID and notification type
- Cannot be forged or reused for different users/types

### Parameter Validation

- All unsubscribe requests validate user ID, notification type, and token
- Invalid requests are rejected with appropriate error messages
- Malicious token manipulation attempts fail gracefully

## User Experience

### Unsubscribe Flow

1. User receives email notification with unsubscribe link
2. Clicks link to visit unsubscribe confirmation page
3. Confirms unsubscribe action via JavaScript/API call
4. Receives success confirmation
5. Email notifications for that type are disabled

### Granular Control

- Unsubscribe only affects the specific notification type
- In-app notifications remain enabled unless explicitly disabled
- Users can re-enable email notifications through account settings

## API Endpoints

### GET /unsubscribe

Displays the unsubscribe confirmation page.

**Parameters:**
- `user`: User ID
- `type`: Notification type
- `token`: Security token

**Response:** HTML page with confirmation form

### POST /api/unsubscribe

Processes the unsubscribe request.

**Request Body:**
```json
{
  "user": 123,
  "type": "placement_request_response",
  "token": "abc123..."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "You have been successfully unsubscribed from this notification type."
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid unsubscribe request. The link may be expired or invalid."
}
```

## Integration with Notification System

### NotificationMail Base Class

All email notifications extend `NotificationMail`, which automatically:

- Generates unsubscribe URLs using `UnsubscribeService`
- Includes unsubscribe URL in template data
- Ensures consistent unsubscribe functionality across all email types

### NotificationService Integration

The `NotificationService` respects unsubscribe preferences:

- Checks email preferences before queuing email jobs
- Only sends emails for enabled notification types
- Preserves in-app notifications when email is disabled

## Testing

### Unit Tests

- `UnsubscribeServiceTest`: Tests token generation, verification, and unsubscribe logic
- Token security and validation scenarios
- Preference update functionality

### Feature Tests

- `UnsubscribeTest`: Tests web and API endpoints
- `UnsubscribeIntegrationTest`: End-to-end unsubscribe flow
- Email template integration testing
- Security and validation testing

### Test Coverage

- Token generation and verification
- URL generation and validation
- Web page rendering and functionality
- API endpoint behavior
- Integration with notification system
- Security and edge cases

## Configuration

No additional configuration is required. The system uses:

- `config('app.key')` for token generation
- `config('app.url')` for URL generation
- Existing notification preference system

## Monitoring

The unsubscribe system integrates with existing notification monitoring:

- Failed unsubscribe attempts are logged
- Preference changes are tracked in the database
- Admin panel shows notification delivery statistics

## Future Enhancements

Potential improvements for future versions:

- Bulk unsubscribe from all email notifications
- Temporary unsubscribe with automatic re-enable
- Unsubscribe reason collection and analytics
- Email frequency preferences (daily digest, etc.)