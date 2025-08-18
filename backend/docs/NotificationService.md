# NotificationService Documentation

## Overview

The `NotificationService` is responsible for routing notifications to users through multiple channels (email and in-app) based on their individual preferences. It integrates with the existing notification system while adding email delivery capabilities.

## Usage

### Basic Usage

```php
use App\Services\NotificationService;
use App\Enums\NotificationType;

$service = new NotificationService();

$service->send(
    $user,
    NotificationType::PLACEMENT_REQUEST_ACCEPTED->value,
    [
        'message' => 'Your placement request has been accepted!',
        'link' => '/placement-requests/123',
        'cat_name' => 'Fluffy',
        'helper_name' => 'John Doe',
    ]
);
```

### Channel-Specific Sending

```php
// Send only email notification
$service->sendEmail($user, $type, $data);

// Send only in-app notification
$service->sendInApp($user, $type, $data);
```

## How It Works

1. **Preference Check**: The service first retrieves the user's notification preferences for the specific notification type
2. **Channel Routing**: Based on preferences, it routes the notification to appropriate channels:
   - **In-App**: Creates a notification record and marks it as delivered immediately
   - **Email**: Creates a notification record and queues a `SendNotificationEmail` job
3. **Tracking**: All notifications are tracked in the database with delivery status

## Data Structure

### Required Data Fields

- `message` (string): The notification message text
- `link` (string, optional): Deep link to relevant page in the application

### Additional Data

Any additional data passed in the `$data` array will be stored in the notification's `data` JSON field for later use by email templates or frontend display.

## User Preferences

The service respects user preferences stored in the `notification_preferences` table:

- `email_enabled`: Whether to send email notifications for this type
- `in_app_enabled`: Whether to create in-app notifications for this type

### Default Behavior

If no preferences exist for a user/type combination, the service defaults to **both channels enabled**.

## Integration Points

### With Existing Notification System

- Uses the existing `Notification` model and database table
- Compatible with existing `NotificationController` API endpoints
- Maintains backward compatibility with current notification display

### With Email System

- Queues email jobs for asynchronous processing
- Tracks email delivery status in notification records
- Integrates with Laravel's mail system configuration

## Error Handling

- **Database Errors**: Logged but don't prevent other channel delivery
- **Queue Errors**: Email job failures are tracked in notification records
- **Missing Data**: Gracefully handles empty or missing data fields

## Testing

The service includes comprehensive test coverage:

- **Unit Tests**: `NotificationServiceTest` - Tests core functionality
- **Integration Tests**: `NotificationServiceIntegrationTest` - Tests system integration

## Future Enhancements

This service is designed to support future features:

- Additional notification channels (SMS, push notifications)
- Notification scheduling and batching
- Advanced preference management (frequency, quiet hours)
- Template-based message generation

## Related Components

- `NotificationPreference` model - Manages user preferences
- `SendNotificationEmail` job - Handles asynchronous email delivery
- `NotificationController` - API endpoints for notification management
- `NotificationType` enum - Defines available notification types