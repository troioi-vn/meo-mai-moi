# Admin operations

The Filament panel is the operational surface for support, moderation, and
configuration. In local development it is available at
`http://localhost:8001`; deployments may use a dedicated admin domain.

Only users with the `admin` or `super_admin` role can enter the panel.
High-impact queue operations are restricted to `super_admin`. Main-app API
authorization remains relationship- and ownership-based: an admin role does
not grant access through user-facing API endpoints.

## Navigation

- **Management**: users, pets, helper profiles, placements, transfers, and
  registration workflows.
- **User features**: ledgers, groups, resource invitations, and habits.
- **Communication**: chats, messages, and notification records.
- **Operations**: email delivery, translations, API request logs, token
  revocation audits, and queue operations.
- **Configuration**, **System**, and **Pets data**: platform settings,
  reference data, and pet-care records.

The dashboard highlights delivery failures, queue pressure, translation
failures, API activity, and pending approval work.

## Support workflow

Start from the affected user record. Its diagnostic sections show ban state,
Telegram linkage, notification preferences, push subscriptions, recent
notifications, and email delivery. Sensitive invitation tokens, push
credentials, and API token values are never displayed.

Use impersonation only when reproducing a user-visible problem is necessary.
Return to the admin panel immediately after testing and avoid changing user
data unless the support request explicitly requires it.

## Moderation

Chats expose participants and their message history. Message removal is a
soft-delete operation and should be used only for abuse, privacy, or safety
cases.

Placement responses and transfer requests must be changed through their
dedicated actions. Those actions run the same lifecycle services as the API,
including relationship updates, sibling-response handling, placement state,
and notifications. Do not edit lifecycle status directly in the database.

Group membership removal preserves the last-admin rule. Ledger membership
removal preserves the last-member rule. Group deletion and ledger archival
also revoke pending invitations through their domain services.

## Resource invitations

The resource-invitation view covers pet, group, and ledger invitations. Raw
tokens are intentionally hidden. A pending, unexpired invitation may be
revoked; accepted, declined, revoked, or expired invitations are audit-only.

## Translation failures

The content-translation resource shows asynchronous translations for public
pet, helper, and placement content. Filter by `failed`, inspect the recorded
error and source context, then use **Retry**. Retrying dispatches the normal
translation job; do not edit translated content or morph identifiers directly.

## Queue failures

Queue Operations shows database queue depth and failed jobs. Retry a failed
job once after confirming the underlying configuration or data issue has been
fixed. Delete a failed job only when it is obsolete or cannot safely be
replayed. Both actions require `super_admin`.

Application queue visibility complements infrastructure monitoring; process
health, scheduler execution, Reverb, Docker, and host metrics remain outside
Filament.

## API investigations

API request logs are immutable and can be filtered by user, authentication
mode, route/path, response status, and time. Use them to investigate quota
denials, client errors, and failing integrations.

Token revocation audits are also immutable. They identify who revoked a token,
whose token was affected, the source of the action, and when it happened.

## Validation after admin changes

Run focused tests first, then:

```bash
cd backend
php artisan test --parallel --processes=4
composer phpstan
./vendor/bin/pint
```
