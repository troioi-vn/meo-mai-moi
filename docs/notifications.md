# Notification Templates Admin

This document explains how notification templates work and how to manage them in the admin panel.

## Runtime delivery (quick overview)

- **Bell + message badges**: The SPA uses a unified endpoint (`GET /api/notifications/unified`, `auth:sanctum` + `verified`) for counts, plus Echo/Reverb for real-time updates.
- **Bell list loading**: The bell notification list is loaded when the user visits the `/notifications` page (counts are maintained elsewhere).
- **Real-time events**: The per-user private channel (`App.Models.User.{id}`) broadcasts `NotificationCreated` (new bell item) and `NotificationRead` (read state sync across tabs/devices). Messaging updates use `MessageSent`.
- **Chat digests**: Unread messages are batched and sent via email every 15 minutes (configurable via scheduler) to reduce email fatigue.
- **Unread message count**: `unread_message_count` represents total unread messages across chats (not "unread chats"). The legacy `GET /api/msg/unread-count` endpoint is kept for compatibility but aligns with this naming.
- **Device push**: Web push notifications are handled separately; see `docs/push-notifications.md`.
- **Telegram**: Users can link their Telegram account to receive notifications via bot; see [Telegram Notifications](#telegram-notifications) below.
- **Notification actions**: Bell notifications can include actionable buttons (e.g., approve/unapprove) that execute server-side actions directly from the notification list.

## Overview

Notifications support multiple channels (Email, In-App/Bell, and Telegram) and localized templates. Defaults live in the repo as files; admins can create DB overrides per type/channel/locale. The system resolves templates with locale fallbacks (user -> Accept-Language -> app default -> en).

- Types registry: `backend/config/notification_templates.php`
- DB model: `backend/app/Models/NotificationTemplate.php`
- Services: `NotificationLocaleResolver`, `NotificationTemplateResolver`, `NotificationTemplateRenderer`
- In-app defaults: `backend/resources/templates/notifications/bell/{locale}/{slug}.md`
- Email defaults: Blade views at `emails.notifications.{locale}.{slug}` (legacy `emails.notifications.{slug}`)

## Admin Panel

Path: Admin → Notifications → Templates

- List view
  - Shows type, channel, locale, engine, status, version, updated at
  - Filters: channel, locale, type (slug labels)
  - Empty state: Explains that file defaults are in use; “Create override” CTA

- Create/Edit
  - Type (event trigger): Select populated from registry, filtered by selected channel
  - Channel: Email or In-App
  - Locale: defaults to app default
  - Engine: Blade/Markdown/Text
  - Subject (optional, email only)
  - Body (required)
  - Available variables: Lists variables from the registry entry
  - Prefill from defaults: Selecting type/channel/locale preloads body/engine from the file defaults

- Actions
  - Preview: Renders current draft
    - Email: HTML preview
    - In-App: pre-wrapped plain text preview
  - Compare with Default: Side-by-side DB vs file default for subject/body
  - Reset to Default: Deletes override so file default applies again
  - Send Test Email: Sends rendered email to the logged-in admin (email channel)

## How resolution works

1. DB override (active) for type/channel/locale
2. File default for type/channel using locale fallback chain
3. Final safety fallback logs a warning

## Seeding

A small seeder adds two inactive in-app overrides so the list isn’t empty on fresh setups:

- `backend/database/seeders/NotificationTemplateSeeder.php`
- Registered in `DatabaseSeeder`
- Uses enum values from `App\\Enums\\NotificationType`

Run it:

```bash
php backend/artisan db:seed --class=NotificationTemplateSeeder --force
```

## Telegram Notifications

Users can link their Telegram account to receive notification messages from a bot configured by an admin.

### Admin setup

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather) and obtain the bot token.
2. In the admin panel go to **Settings** (System group) and fill in **Telegram Bot Token** and **Telegram Bot Username** (without the `@`).
3. Register the webhook so Telegram forwards messages to your app:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/webhooks/telegram"
```

The webhook endpoint (`POST /api/webhooks/telegram`) is public (no auth) and handles incoming `/start` commands from users.

### User linking flow

1. User opens **Settings > Notifications** and clicks **Connect Telegram**.
2. The frontend calls `POST /api/telegram/link-token` which generates a short-lived token (30 min) and returns a `t.me` deep link: `https://t.me/<bot>?start=<token>`.
3. The link opens in a new tab. When the user sends `/start <token>` to the bot, the webhook:
   - Validates the token and expiry.
   - Stores the Telegram `chat_id` on the user record.
   - Sends a confirmation message back via the bot.
4. The frontend polls `GET /api/telegram/status` every 3 seconds (up to 5 minutes) to detect the connection.
5. Once connected, the user sees a **Disconnect** button which calls `DELETE /api/telegram/disconnect`.

If a user sends `/start` without a token, the bot replies with a guidance message directing them to the app's notification settings page.

### Mini App sign-in flow

- Telegram Mini App users authenticate via `POST /api/auth/telegram/miniapp` using `Telegram.WebApp.initData`.
- This flow is for account authentication/registration; notification delivery still uses bot chat linking (`/start <token>`) and `telegram_chat_id`.
- Existing users can continue linking/unlinking Telegram from **Settings > Notifications** without changing this behavior.

### Per-type preferences

Each notification type has a `telegram_enabled` toggle alongside `email_enabled` and `in_app_enabled`. The `NotificationService` checks this preference before dispatching via `TelegramNotificationChannel`.

### Key files

| Purpose                    | Path                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| Channel implementation     | `app/Services/Notifications/TelegramNotificationChannel.php`                 |
| Webhook handler            | `app/Http/Controllers/Telegram/TelegramWebhookController.php`                |
| Status / link / disconnect | `app/Http/Controllers/Telegram/Get*.php`, `Generate*.php`, `Disconnect*.php` |
| Migration                  | `database/migrations/2026_02_16_000000_add_telegram_support.php`             |
| Frontend card              | `frontend/src/components/notifications/TelegramNotificationsCard.tsx`        |
| Admin settings             | `app/Filament/Pages/SystemSettings.php` (Telegram section)                   |

### Database fields

**users table**: `telegram_chat_id`, `telegram_link_token`, `telegram_link_token_expires_at`
**notification_preferences table**: `telegram_enabled` (boolean, default false)

## Notes & Next Steps

- Diff highlighting in Compare (currently plaintext side-by-side)
- Send Test: choose target user + sample payloads
- CLI: `notifications:sync-templates` to validate and diff DB vs file defaults
- Tests: unit (resolver/renderer/locale), feature (admin CRUD + preview/compare/reset/send-test), integration (override precedence and metadata)
