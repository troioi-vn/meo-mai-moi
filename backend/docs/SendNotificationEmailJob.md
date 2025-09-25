# SendNotificationEmail Job Documentation

## Overview

The `SendNotificationEmail` job is responsible for asynchronously processing email notifications in the email notifications system. It handles the actual sending of emails through the configured email provider and tracks delivery status.

## Job Configuration

- **Queue**: Default queue
- **Retries**: 3 attempts
- **Backoff**: [60, 300, 900] seconds (1 min, 5 min, 15 min)
- **Timeout**: Default Laravel timeout

## Job Parameters

The job accepts the following parameters:

- `User $user` - The recipient user
- `string $type` - The notification type (must match NotificationType enum)
- `array $data` - Additional data for the email template
- `int $notificationId` - The ID of the notification record to track

## Functionality

### Email Sending Process

1. **Validation**: Checks if the notification record exists
2. **Duplicate Prevention**: Skips processing if notification is already delivered or failed
3. **Mail Class Creation**: Creates appropriate mail class based on notification type
4. **Email Sending**: Sends email through Laravel's Mail facade
5. **Status Tracking**: Updates notification record with delivery timestamp

### Supported Notification Types

The job supports the following notification types:

- `PLACEMENT_REQUEST_RESPONSE` → `PlacementRequestResponseMail`
- `PLACEMENT_REQUEST_ACCEPTED` → `PlacementRequestAcceptedMail`
- `HELPER_RESPONSE_ACCEPTED` → `HelperResponseAcceptedMail`
- `HELPER_RESPONSE_REJECTED` → `HelperResponseRejectedMail`

### Error Handling

#### Job Failures
When the job fails, the `failed()` method:

1. Updates the notification record with failure timestamp and reason
2. Logs detailed error information
3. Truncates failure reason if longer than 500 characters

#### Common Failure Scenarios
- Invalid notification type
- Missing notification record
- Email provider connection issues
- Invalid email addresses
- Template rendering errors

### Delivery Status Tracking

The job updates the notification record with:

- `delivered_at` - Timestamp when email was successfully sent
- `failed_at` - Timestamp when email delivery failed
- `failure_reason` - Error message (truncated to 500 chars)

### Logging

The job provides comprehensive logging:

- **Success**: Logs successful email delivery with user and notification details
- **Failure**: Logs failure details including error message and attempt count
- **Skipped**: Logs when notifications are skipped (already processed)
- **Missing**: Logs when notification records are not found

## Usage Examples

### Dispatching the Job

```php
use App\Jobs\SendNotificationEmail;
use App\Enums\NotificationType;

// Dispatch email notification job
SendNotificationEmail::dispatch(
    $user,
    NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
   ['pet_id' => $pet->id],
    $notification->id
);
```

### Queue Processing

The job is designed to work with Laravel's queue system:

```bash
# Process jobs synchronously (for testing)
php artisan queue:work --once

# Process jobs continuously
php artisan queue:work

# Process specific queue
php artisan queue:work --queue=emails
```

## Testing

The job includes comprehensive test coverage:

### Unit Tests (`SendNotificationEmailJobTest`)
- Email sending for all notification types
- Error handling and failure scenarios
- Delivery status tracking
- Retry configuration validation

### Integration Tests (`EmailNotificationJobIntegrationTest`)
- Queue integration
- Concurrent processing handling
- Real queue processing simulation

## Performance Considerations

### Queue Configuration
- Uses exponential backoff for retries
- Prevents duplicate processing
- Handles concurrent job execution

### Database Updates
- Minimal database queries per job
- Atomic status updates
- Proper indexing on notification lookups

### Memory Usage
- Serializes minimal data
- Cleans up resources after processing
- Handles large failure messages gracefully

## Monitoring

### Key Metrics to Monitor
- Job success/failure rates
- Average processing time
- Queue depth and processing lag
- Email delivery rates by provider

### Log Analysis
Monitor logs for:
- Repeated failures for specific users
- Email provider connection issues
- Invalid notification types
- Missing notification records

## Troubleshooting

### Common Issues

1. **High Failure Rate**
   - Check email provider configuration
   - Verify network connectivity
   - Review email template syntax

2. **Jobs Not Processing**
   - Ensure queue worker is running
   - Check queue configuration
   - Verify job serialization

3. **Duplicate Emails**
   - Check for multiple queue workers
   - Verify notification status updates
   - Review job dispatching logic

### Debug Commands

```bash
# Check failed jobs
php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all

# Clear failed jobs
php artisan queue:flush
```