# NotificationResource Documentation

## Overview

The NotificationResource provides a comprehensive admin panel interface for managing notifications with delivery tracking and user engagement metrics. This resource implements requirements 5.2 and 5.5 from the admin panel entities specification.

## Features

### 1. Notification Type Display
- Supports multiple notification types with human-readable display names
- Types include: placement requests, transfers, handovers, reviews, profile updates, and system announcements
- Automatic formatting of custom notification types

### 2. Delivery Status Tracking
- **Pending**: Notifications awaiting delivery
- **Delivered**: Successfully delivered notifications
- **Failed**: Notifications that failed to deliver with failure reasons

### 3. User Engagement Metrics
- **Read Status**: Tracks whether notifications have been read
- **Engagement Status**: Combines delivery and read status for comprehensive tracking
- **Read Timestamps**: Records when notifications were read

### 4. Notification History Views
- Tabbed interface with filters for different notification states
- Comprehensive filtering by type, delivery status, engagement status, and date ranges
- Real-time badge counts for each tab

### 5. Notification Management Actions

#### Individual Actions
- **Mark as Read/Unread**: Toggle read status
- **Mark as Delivered**: Manually mark notifications as delivered
- **Mark as Failed**: Mark notifications as failed with reason
- **Retry Delivery**: Reset failed notifications for retry
- **View/Edit/Delete**: Standard CRUD operations

#### Bulk Actions
- **Bulk Read/Unread**: Manage multiple notifications at once
- **Bulk Delivery Status**: Update delivery status for multiple notifications
- **Cleanup Old Notifications**: Remove old notifications with configurable criteria

### 6. Cleanup Actions
- Configurable cleanup of old notifications
- Options to cleanup only read notifications
- Configurable time periods (30, 60, 90, 180, 365 days)
- Bulk cleanup with confirmation

## Database Schema

The notifications table includes the following fields:

```sql
- id: Primary key
- user_id: Foreign key to users table
- type: Notification type (nullable)
- message: Notification message content
- link: Optional action link
- data: JSON field for additional structured data
- is_read: Boolean read status
- read_at: Timestamp when notification was read
- delivered_at: Timestamp when notification was delivered
- failed_at: Timestamp when delivery failed
- failure_reason: Text description of delivery failure
- created_at/updated_at: Standard timestamps
```

## Model Features

### Relationships
- `user()`: Belongs to User model

### Attributes
- `type_display`: Human-readable notification type
- `delivery_status`: Current delivery status (pending/delivered/failed)
- `engagement_status`: Combined engagement status

### Scopes
- `unread()`: Filter unread notifications
- `read()`: Filter read notifications
- `delivered()`: Filter delivered notifications
- `failed()`: Filter failed notifications
- `pending()`: Filter pending notifications

## Admin Panel Features

### Navigation
- Located in "Communication" navigation group
- Badge showing unread notification count
- Dynamic badge colors based on unread count

### Dashboard Widget
- Statistics overview showing:
  - Total notifications
  - Unread notifications
  - Delivery rate percentage
  - Engagement rate percentage
  - Failed deliveries
  - Pending deliveries

### Auto-refresh
- Table auto-refreshes every 30 seconds
- Real-time updates for notification status

## Usage Examples

### Creating Notifications Programmatically

```php
use App\Models\Notification;

// Create a basic notification
Notification::create([
    'user_id' => $user->id,
    'type' => 'placement_request',
    'message' => 'A new placement request has been submitted.',
    'link' => '/admin/placement-requests/' . $request->id,
]);

// Create notification with additional data
Notification::create([
    'user_id' => $user->id,
    'type' => 'transfer_accepted',
    'message' => 'Your transfer request has been accepted.',
    'data' => [
        'transfer_id' => $transfer->id,
        'cat_name' => $transfer->cat->name,
        'priority' => 'high',
    ],
    'delivered_at' => now(), // Mark as delivered immediately
]);
```

### Querying Notifications

```php
// Get unread notifications for a user
$unreadNotifications = Notification::where('user_id', $userId)
    ->unread()
    ->get();

// Get failed notifications for retry
$failedNotifications = Notification::failed()
    ->where('created_at', '>', now()->subHours(24))
    ->get();

// Get engagement metrics
$deliveryRate = Notification::delivered()->count() / Notification::count() * 100;
$engagementRate = Notification::read()->count() / Notification::delivered()->count() * 100;
```

### Cleanup Operations

```php
// Cleanup old read notifications (90+ days)
$cutoffDate = now()->subDays(90);
Notification::where('created_at', '<', $cutoffDate)
    ->where('is_read', true)
    ->delete();
```

## Testing

Run the comprehensive test suite:

```bash
php artisan test:notification-resource
```

This command tests:
- Model functionality and relationships
- Scopes and attributes
- Notification actions
- Cleanup functionality
- All notification types

## Requirements Fulfilled

### Requirement 5.2: Notification Management
✅ Create NotificationResource with notification type and recipient display
✅ Implement delivery status tracking and user engagement metrics
✅ Add notification history views and status filtering

### Requirement 5.5: Communication Monitoring
✅ Create notification management and cleanup actions
✅ Implement comprehensive filtering and bulk operations
✅ Add dashboard statistics and monitoring

## Files Created/Modified

1. **Model Enhancement**: `app/Models/Notification.php`
2. **Migration**: `database/migrations/2025_08_16_180528_add_delivery_tracking_to_notifications_table.php`
3. **Resource**: `app/Filament/Resources/NotificationResource.php`
4. **Pages**: 
   - `app/Filament/Resources/NotificationResource/Pages/ListNotifications.php`
   - `app/Filament/Resources/NotificationResource/Pages/CreateNotification.php`
   - `app/Filament/Resources/NotificationResource/Pages/ViewNotification.php`
   - `app/Filament/Resources/NotificationResource/Pages/EditNotification.php`
5. **Widget**: `app/Filament/Widgets/NotificationStatsWidget.php`
6. **Seeder**: `database/seeders/NotificationSeeder.php`
7. **Test**: `tests/Feature/NotificationResourceTest.php`
8. **Command**: `app/Console/Commands/TestNotificationResource.php`