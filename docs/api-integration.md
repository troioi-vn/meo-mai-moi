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

- `create`
- `read`
- `update`
- `delete`

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
- `read` for `GET /api/my-pets`
- `read` for `GET /api/my-pets/sections`
- `create` for `POST /api/pets`
- `update` for `PUT /api/pets/{pet}`
- `update` for `PUT /api/pets/{pet}/status`
- `delete` for `DELETE /api/pets/{pet}`
- `create` for `POST /api/pets/{pet}/weights`
- `update` for `PUT /api/pets/{pet}/weights/{weight}`
- `delete` for `DELETE /api/pets/{pet}/weights/{weight}`
- `create` for `POST /api/pets/{pet}/medical-records`
- `update` for `PUT /api/pets/{pet}/medical-records/{record}`
- `delete` for `DELETE /api/pets/{pet}/medical-records/{record}`
- `create` for `POST /api/pets/{pet}/vaccinations`
- `update` for `PUT /api/pets/{pet}/vaccinations/{record}`
- `create` for `POST /api/pets/{pet}/vaccinations/{record}/renew`
- `delete` for `DELETE /api/pets/{pet}/vaccinations/{record}`
- `create` for `POST /api/pets/{pet}/microchips`
- `update` for `PUT /api/pets/{pet}/microchips/{microchip}`
- `delete` for `DELETE /api/pets/{pet}/microchips/{microchip}`

Session-authenticated browser requests are not constrained by PAT abilities.

This is the current first slice of explicit PAT support. Other authenticated areas such as notifications, messaging, placement workflows, helper profiles, and some profile-adjacent routes still need an explicit PAT product decision before they should be treated as stable programmatic contract.

Public/optional-auth pet health reads remain public in this slice:

- `GET /api/pets/{pet}/weights`
- `GET /api/pets/{pet}/weights/{weight}`
- `GET /api/pets/{pet}/medical-records`
- `GET /api/pets/{pet}/medical-records/{record}`
- `GET /api/pets/{pet}/vaccinations`
- `GET /api/pets/{pet}/vaccinations/{record}`
- `GET /api/pets/{pet}/microchips`
- `GET /api/pets/{pet}/microchips/{microchip}`

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
