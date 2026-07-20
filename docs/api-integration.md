# API Integration

This page documents the current external API contract and operational behavior for programmatic clients.

## Contract Scope

Current canonical pet-management contract:

- `GET /api/my-pets`
- `GET /api/my-pets/sections`
- `POST /api/pets`
- `GET /api/pets/{pet}`
- `PUT /api/pets/{pet}`
- `PUT /api/pets/{pet}/status`
- `DELETE /api/pets/{pet}`
- `POST /api/pets/{pet}/weights`
- `PUT /api/pets/{pet}/weights/{weight}`
- `DELETE /api/pets/{pet}/weights/{weight}`
- `POST /api/pets/{pet}/medical-records`
- `PUT /api/pets/{pet}/medical-records/{record}`
- `DELETE /api/pets/{pet}/medical-records/{record}`
- `POST /api/pets/{pet}/vaccinations`
- `PUT /api/pets/{pet}/vaccinations/{record}`
- `POST /api/pets/{pet}/vaccinations/{record}/renew`
- `DELETE /api/pets/{pet}/vaccinations/{record}`
- `POST /api/pets/{pet}/microchips`
- `PUT /api/pets/{pet}/microchips/{microchip}`
- `DELETE /api/pets/{pet}/microchips/{microchip}`
- `GET|POST /api/habits`
- `GET|PUT|DELETE /api/habits/{habit}`
- `GET /api/habits/{habit}/heatmap`
- `GET|PUT /api/habits/{habit}/entries/{date}`
- `POST /api/habits/{habit}/archive`
- `POST /api/habits/{habit}/restore`
- `POST /api/pets/{pet}/photos`
- `POST /api/pets/{pet}/photos/{photo}/set-primary`
- `DELETE /api/pets/{pet}/photos/{photo}`

Notes:

- The platform currently treats `/api/*` as the active v1 contract.
- `PATCH /api/pets/{pet}` is not part of the external contract.
- Success responses follow the standard envelope: `{ success, data, message? }`.
- Error responses follow: `{ success: false, data: null, message, error, errors? }` (field `errors` appears for validation failures).
- `POST /api/pets` requires `country` (ISO 3166-1 alpha-2, e.g. `VN`).
- `GET /api/my-pets` and `GET /api/my-pets/sections` include a compact `health_summary` on each pet for list views. This summary currently exposes latest and previous weight values plus aggregate vaccination status so clients can render pet cards without per-pet follow-up requests.

## Authentication

Primary external auth is Sanctum personal access tokens (Bearer token).

Token permissions currently available:

- `pet:read`
- `pets:read` (MCP pet-profile grants)
- `pet:write`
- `health:read`
- `health:write`
- `habits:read`
- `habits:write`
- `microchips:read`
- `microchips:write`
- `sharing:read`
- `sharing:write`
- `placement:read`
- `placement:write`
- `helpers:read`
- `helpers:write`
- `messages:read`
- `messages:write`
- `profile:read`
- `create`
- `read`
- `update`
- `delete`

New manually created tokens default to `read` only. Existing user-created PATs
retain the generic abilities. MCP exchange tokens instead receive only the
independently consented domain abilities: `pets:read`, `health:read`,
`pet:write` (from MCP scope `pets:write`), `health:write`, `habits:read`,
`habits:write`, `microchips:read`, `microchips:write`, `sharing:read`,
`sharing:write`, `placement:read`, `placement:write`, `helpers:read`,
`helpers:write`, `messages:read`, and/or `messages:write`.

### Token Management (SPA)

Developer UI route:

- `/developer`

JSON endpoints used by the SPA:

- `GET /api/user/api-tokens`
- `POST /api/user/api-tokens`
- `PUT /api/user/api-tokens/{tokenId}`
- `DELETE /api/user/api-tokens/{tokenId}`

Security behavior:

- Token management is intentionally session-only. Personal access tokens cannot list, create, update, or revoke other tokens, even if they have broad abilities.
- Plaintext token is returned only once on creation.
- Plaintext token is never retrievable later.
- In the `/developer` UI, newly created tokens are shown in a dedicated confirmation dialog with copy/download actions until the user confirms they saved the token.

### Ability enforcement for PAT clients

The currently enforced programmatic contract is:

- `read` for `GET /api/users/me`
- `read` or `pets:read` for `GET /api/my-pets`
- `read` or `pets:read` for `GET /api/my-pets/sections`
- `read` or `pets:read` for `GET /api/pets/{pet}`
- `read` or `health:read` for weight, medical-record, and vaccination `GET` routes
- `create` or `pet:write` for `POST /api/pets`
- `update` or `pet:write` for `PUT /api/pets/{pet}`
- `update` for `PUT /api/pets/{pet}/status`
- `delete` for `DELETE /api/pets/{pet}`
- `create` or `health:write` for `POST /api/pets/{pet}/weights`
- `update` or `health:write` for `PUT /api/pets/{pet}/weights/{weight}`
- `delete` for `DELETE /api/pets/{pet}/weights/{weight}`
- `create` or `health:write` for `POST /api/pets/{pet}/medical-records`
- `update` or `health:write` for `PUT /api/pets/{pet}/medical-records/{record}`
- `delete` for `DELETE /api/pets/{pet}/medical-records/{record}`
- `create` or `health:write` for `POST /api/pets/{pet}/vaccinations`
- `update` or `health:write` for `PUT /api/pets/{pet}/vaccinations/{record}`
- `create` for `POST /api/pets/{pet}/vaccinations/{record}/renew`
- `delete` for `DELETE /api/pets/{pet}/vaccinations/{record}`
- `read` or `habits:read` for habit `GET` routes
- `create` or `habits:write` for `POST /api/habits`
- `update` or `habits:write` for habit update, day-entry, archive, and restore routes
- `delete` or `habits:write` for `DELETE /api/habits/{habit}`
- `update` or `pet:write` for pet-photo upload and primary-photo routes
- `delete` or `pet:write` for pet-photo deletion
- `read` or `microchips:read` for microchip `GET` routes
- `create` or `microchips:write` for `POST /api/pets/{pet}/microchips`
- `update` or `microchips:write` for `PUT /api/pets/{pet}/microchips/{microchip}`
- `delete` or `microchips:write` for `DELETE /api/pets/{pet}/microchips/{microchip}`
- `read` or `sharing:read` for the narrowed pet-sharing, collaborator-suggestion,
  pending-invitation, and MCP body-token invitation-preview routes
- `create`, `update`, or `delete` (according to the legacy route) or
  `sharing:write` for pet collaborator, invitation, and leave mutations
- `read` or `placement:read` for open-placement, request detail/context, and
  owner response-list reads
- `read` or `helpers:read` for public/visible helper profiles plus country/city
  option reads
- `read` or `messages:read` for chat, message, and unread-count reads
- `create`, `update`, or `delete` (according to the legacy route) or
  `placement:write` for placement request, response, transfer, and finalization
  mutations; the legacy placement `confirm`/`reject` no-op routes are excluded
- `create`, `update`, or `delete` (according to the legacy route) or
  `helpers:write` for own helper-profile, lifecycle, and photo mutations
- `create`, `update`, or `delete` (according to the legacy route) or
  `messages:write` for placement-context direct chats, messages, explicit read
  receipts, own-message deletion, and leaving a chat

Message listing is side-effect free. Clients use the explicit chat-read route
when they intend to update read receipts. Message list/create responses expose
`updated_at` for optimistic-concurrency deletion, and the chat-read response
returns the exact `chat_id` and `last_read_at` receipt for post-write
verification.

Multipart helper-profile updates include `uploaded_photo_ids` when photos were
created. The field is stable under `Idempotency-Key` replay so clients can
verify the exact uploaded media instead of guessing from collection order.

MCP invitation preview/accept/decline uses the dedicated
`/api/mcp/resource-invitations/*` routes and carries the 64-character bearer
token in the JSON body. This keeps it out of gateway, proxy, and API request
paths. Browser invitation pages retain the public `/api/resource-invitations/{token}`
contract.

Session-authenticated browser requests are not constrained by PAT abilities.

For tokens with `pet:write`, `POST /api/pets` serializes creates per user and
rejects an exact case-insensitive name/pet-type duplicate with HTTP `409` and
stable `data.existing_pet_ids`. Send `allow_duplicate: true` only for a
deliberately distinct animal. An `Idempotency-Key` replay is resolved before
the duplicate guard, so retrying the original request returns its original
success. Pet, health, habit, photo, microchip, sharing, placement, helper, and
messaging mutations accept `base_version` from the documented target read when
the target already exists; a stale version returns HTTP `409` without applying
the update. All MCP-exposed creates, updates, lifecycle
changes, uploads, and deletes use `Idempotency-Key`. Multipart fingerprints use
form fields plus file content hashes rather than transport boundaries, so an
exact photo retry is replayable. Sharing changes also touch the pet's sharing
version; invitation consume/revoke actions use the invitation version. The
dedicated `GET /api/pets/{pet}/sharing` response excludes email addresses,
history, and creator identifiers.

Notifications, groups, finance, and profile-adjacent routes still need an
explicit PAT product decision before they should be treated as stable
programmatic contracts.

Pet health reads remain available to unauthenticated callers where the pet's
visibility permits it. An authenticated PAT caller must present `read` or the
MCP-specific domain read ability:

- `GET /api/pets/{pet}/weights`
- `GET /api/pets/{pet}/weights/{weight}`
- `GET /api/pets/{pet}/medical-records`
- `GET /api/pets/{pet}/medical-records/{record}`
- `GET /api/pets/{pet}/vaccinations`
- `GET /api/pets/{pet}/vaccinations/{record}`
- `GET /api/pets/{pet}/microchips` and
  `GET /api/pets/{pet}/microchips/{microchip}` with `microchips:read`

### GPT Auth Bridge

GPT connector OAuth uses these bridge endpoints:

- `POST /api/gpt-auth/register`
- `POST /api/gpt-auth/telegram-link`
- `POST /api/gpt-auth/confirm`
- `POST /api/gpt-auth/exchange`
- `POST /api/gpt-auth/revoke`

Important registration semantics:

- The connector does not provide a trusted email address or username from ChatGPT.
- During `/gpt-connect`, the user enters `name` and `email` directly into the Meo Mai Moi registration form.
- During `/gpt-connect`, Google Sign-In returns to the same consent screen via a safe relative `redirect` back to `/gpt-connect?...`.
- During `/gpt-connect`, Telegram Sign-In uses `POST /api/gpt-auth/telegram-link` to mint a short-lived resume token, then opens the bot with `?start=login_<token>`. After Telegram auth, the Mini App opens `/gpt-connect?...&tg_token=...` so the consent step can continue.
- If email verification is required, `POST /api/gpt-auth/register` keeps the account unverified and sends the normal verification email flow.
- If email verification is disabled globally, GPT-registered users are marked verified immediately.
- GPT-issued Sanctum tokens are minted only after the authenticated user explicitly confirms the connection.
- `POST /api/gpt-auth/exchange` and `POST /api/gpt-auth/revoke` return `401` for an invalid connector API key, and `503` when the backend connector API key is not configured at all. The latter is treated as server misconfiguration and is logged.

## Rate Limits

Rate limiting has two layers:

1. Minute-based throttles (middleware)
2. Daily user quota (business rule)

Minute-based examples:

- Authenticated API group: `throttle:authenticated` (prod 60/min, dev/test/e2e 300/min)
- Public listing endpoints: `throttle:public-api` (prod 30/min, dev/test/e2e 300/min)

Daily quota:

- Regular users: `1000` requests/day by default (configurable)
- Premium users: unlimited
- Window boundary: UTC day (`00:00:00` to `23:59:59` UTC)

Over-quota response:

- Status: `429`
- Error code: `API_DAILY_QUOTA_EXCEEDED`
- Includes machine-readable quota metadata and `reset_at_utc`

## API Request Logging

API requests are persisted to `api_request_logs` for monitoring and support triage.

Logged fields include:

- Timestamp
- Method/path/route pattern
- Status code
- Auth mode (`pat`, `session`, `none`)
- User id (nullable)
- Quota-denied `429` responses from the daily API quota middleware

Retention:

- Default: 30 days (configurable)
- Pruning command: `php artisan api-logs:prune`
- Scheduled daily via `routes/console.php`

## Configuration

Config defaults:

- `backend/config/api.php`

Runtime-configurable settings (via system settings UI):

- `api_daily_quota_regular`
- `api_request_logs_retention_days`

## Related Docs

- [API Conventions](./api-conventions.md)
- [Rate Limiting](./rate-limiting.md)
- [Architecture](./architecture.md)
