# Push Notifications

This document describes the web push notification system implementation.

## Overview

The application supports browser-based push notifications using the Web Push Protocol (RFC 8030) with VAPID authentication. This allows sending notifications to users even when they don't have the app open.

## Architecture

### Backend Components

1. **WebPushDispatcher** (`app/Services/Notifications/WebPushDispatcher.php`)

   - Handles sending push notifications to user devices
   - Uses the `minishlink/web-push` library
   - Manages subscription lifecycle (creation, expiration, deletion)
   - Implements automatic retry and error handling

2. **NotificationObserver** (`app/Observers/NotificationObserver.php`)

   - Automatically triggers push notifications when in-app notifications are created
   - Only sends for notifications with `channel` = `in_app`

3. **PushSubscriptionController** (`app/Http/Controllers/PushSubscriptionController.php`)

   - REST API for managing push subscriptions
   - Endpoints: list, create/update, delete

4. **PushSubscription Model** (`app/Models/PushSubscription.php`)
   - Stores device subscriptions
   - Fields: endpoint, keys (p256dh, auth), content_encoding, expires_at, last_seen_at

### Frontend Components

1. **Service Worker** (`frontend/public/sw-notification-listeners.js`)

   - Listens for push events from the browser
   - Displays notifications using the Notifications API
   - Handles notification clicks and navigation
   - Manages subscription changes

2. **NotificationPreferences Component** (`frontend/src/components/NotificationPreferences.tsx`)

   - UI for managing notification preferences
   - Handles permission requests
   - Manages push subscription lifecycle
   - Provides user feedback on subscription status

3. **Web Push Utilities** (`frontend/src/lib/web-push.ts`)
   - Helper functions for encoding VAPID keys
   - Service worker registration management
   - Subscription serialization

## Configuration

### Environment Variables

**Root `.env` (Docker Compose variables):**

```bash
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

**Backend `backend/.env` (Laravel runtime):**

```bash
# These match the root .env values
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:your-email@example.com
# Optional: override default icon assets used in push payloads
APP_PUSH_ICON=/icon-192.png
APP_PUSH_BADGE=/icon-32.png
```

**How it works:**

- The root `.env` file is read by Docker Compose, which passes `VAPID_PUBLIC_KEY` as a build argument to the Dockerfile
- The Dockerfile sets both `VAPID_PUBLIC_KEY` and `VITE_VAPID_PUBLIC_KEY` environment variables during the frontend build
- The frontend Vite build bakes `VITE_VAPID_PUBLIC_KEY` into the JavaScript bundle
- At runtime, the backend reads VAPID keys from `backend/.env` via Laravel's config system

**Deployment:** The deploy scripts handle this automatically - no manual exports needed!

### Generating VAPID Keys

**Automatic Generation (Recommended):**

The setup script (`utils/setup.sh`) will automatically offer to generate VAPID keys during first-time setup:

```bash
./utils/deploy.sh
```

When prompted, choose "yes" to generate keys automatically. The script will:

- Check for Node.js/npx availability
- Generate keys using `npx web-push generate-vapid-keys`
- Add them to both `.env` and `backend/.env`
- Sync them automatically

**Manual Generation:**

If you prefer to generate keys manually:

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys to both `.env` and `backend/.env`.

**⚠️ Important:** Never regenerate VAPID keys on an existing deployment with active users. Regenerating keys will invalidate all existing push subscriptions, and users will need to re-enable notifications.

## Features

### Payload Structure

Push notifications support the following fields:

```json
{
  "title": "Notification Title",
  "body": "Notification message body",
  "icon": "/icon-192.png",
  "badge": "/icon-32.png",
  "tag": "unique-notification-id",
  "requireInteraction": false,
  "data": {
    "url": "/path/to/page",
    "notification_id": "uuid",
    "type": "notification_type",
    "timestamp": 1234567890,
    "app": {
      "name": "Meo Mai Moi",
      "icon": "/icon-192.png",
      "badge": "/icon-32.png"
    }
  }
}
```

### Error Handling

The system handles various error scenarios:

- **410 Gone / 404 Not Found**: Subscription expired, automatically removed
- **429 Too Many Requests**: Rate limiting, subscription kept
- **Network errors**: Logged but subscription maintained
- **Invalid subscriptions**: Automatically cleaned up

### Subscription Management

- Subscriptions are device-specific (one per browser/device)
- Automatically refreshed when expired
- Tracked with `last_seen_at` timestamp for monitoring
- Can be manually disabled by users

## Usage

### Testing Push Notifications

Use the artisan command:

```bash
php artisan push:test {user_id} --title="Test" --message="Hello"
```

### Sending from Code

```php
use App\Services\Notifications\WebPushDispatcher;
use App\Models\User;

$user = User::find($userId);
$notification = Notification::find($notificationId);

app(WebPushDispatcher::class)->dispatch($user, $notification);
```

### User Subscription Flow

1. User visits notification preferences page
2. Clicks "Enable device notifications"
3. Browser prompts for permission
4. On grant, service worker subscribes to push
5. Subscription saved to backend
6. User receives notifications

### Debugging

Enable logging in the browser console:

```javascript
// In browser DevTools console
localStorage.setItem("debug", "notifications:*");
```

Check Laravel logs for backend issues:

```bash
tail -f storage/logs/laravel.log | grep push
```

## Browser Compatibility

Push notifications work in:

- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS Ventura+)
- Opera 37+

Not supported:

- iOS Safari (mobile)
- IE 11

## Security

- Uses VAPID authentication for secure message delivery
- Subscriptions are tied to specific users
- Endpoint URLs are hashed for privacy
- Keys stored encrypted in database
- Subject must be valid mailto: or https: URL

## Limitations

- Notifications require user permission
- iOS Safari does not support web push (yet)
- Payload size limited to ~4KB
- Rate limits vary by browser vendor
- Users can revoke permission at any time

## Troubleshooting

### Notifications not appearing

1. Check VAPID keys are configured correctly
2. Verify service worker is registered
3. Check browser notification permission
4. Look for errors in browser console
5. Check Laravel logs for backend errors

### Subscription failures

1. Ensure HTTPS (required for production)
2. Check service worker scope
3. Verify VAPID public key matches
4. Check for expired subscriptions

### "Service worker not ready"

1. Wait for page to fully load
2. Reload the page
3. Clear service worker cache
4. Check for JavaScript errors

## Future Improvements

- [ ] Add notification batching for multiple messages
- [ ] Implement notification delivery tracking
- [ ] Add notification action buttons
- [ ] Support notification images
- [ ] Add silent notifications for background sync
- [ ] Implement notification grouping
- [ ] Add delivery reports/analytics
- [ ] Support for notification sounds
