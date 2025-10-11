# Notification Templates Admin

This document explains how notification templates work and how to manage them in the admin panel.

## Overview

Notifications support multiple channels (Email and In-App/Bell) and localized templates. Defaults live in the repo as files; admins can create DB overrides per type/channel/locale. The system resolves templates with locale fallbacks (user -> Accept-Language -> app default -> en).

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

## Notes & Next Steps

- Diff highlighting in Compare (currently plaintext side-by-side)
- Send Test: choose target user + sample payloads
- CLI: `notifications:sync-templates` to validate and diff DB vs file defaults
- Tests: unit (resolver/renderer/locale), feature (admin CRUD + preview/compare/reset/send-test), integration (override precedence and metadata)
