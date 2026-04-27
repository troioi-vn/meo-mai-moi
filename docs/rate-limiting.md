# Rate Limiting

## Strategy

Rate limiting uses three complementary layers:

1. **Group-level default** — Every authenticated route group includes `throttle:authenticated` (300 req/min per user in production). This is the safety net that catches all ~60 authenticated endpoints.
2. **Individual route throttles** — Write-heavy and abuse-attractive endpoints have tighter per-route limits (e.g., file uploads at 10/min, placement requests at 5/min).
3. **Business-level limits** — Some resources have application-level caps independent of HTTP throttling (e.g., invitation/day caps and daily API quota by user plan).

When both group and route throttles apply, both middleware run and the stricter effective limit wins.

## Named Rate Limiters

Defined in `AppServiceProvider::boot()`:

| Limiter         | Production | Dev/Test/E2E | Keyed By                           |
| --------------- | ---------- | ------------ | ---------------------------------- |
| `authenticated` | 300/min    | 300/min      | User ID (or IP if unauthenticated) |
| `public-api`    | 150/min    | 300/min      | IP address                         |

Fortify also registers its own limiters for login, registration, 2FA, and password reset flows.

## Endpoint Limits

### File Uploads

| Endpoint                                           | Limit  |
| -------------------------------------------------- | ------ |
| `POST /pets/{pet}/photos`                          | 10/min |
| `POST /users/me/avatar`                            | 5/min  |
| `POST /pets/{pet}/medical-records/{record}/photos` | 10/min |
| `POST /pets/{pet}/vaccinations/{record}/photo`     | 10/min |

### Messaging

| Endpoint                          | Limit  |
| --------------------------------- | ------ |
| `POST /msg/chats`                 | 10/min |
| `POST /msg/chats/{chat}/messages` | 30/min |

### Placement & Adoption

| Endpoint                                                | Limit  |
| ------------------------------------------------------- | ------ |
| `POST /placement-requests`                              | 5/min  |
| `POST /placement-requests/{placementRequest}/responses` | 10/min |

### Pet & Record Creation

| Endpoint                           | Limit  |
| ---------------------------------- | ------ |
| `POST /pets`                       | 10/min |
| `POST /pets/{pet}/medical-records` | 15/min |
| `POST /pets/{pet}/vaccinations`    | 15/min |
| `POST /pets/{pet}/microchips`      | 10/min |
| `POST /pets/{pet}/weights`         | 15/min |

### Profiles & Subscriptions

| Endpoint                                    | Limit  |
| ------------------------------------------- | ------ |
| `POST /pets/{pet}/relationship-invitations` | 10/min |
| `POST /helper-profiles`                     | 5/min  |
| `POST /push-subscriptions`                  | 5/min  |

### Invitations

| Endpoint                     | Limit                                  |
| ---------------------------- | -------------------------------------- |
| `POST /invitations`          | 10/hour (throttle) + 10/day (business) |
| `DELETE /invitations/{id}`   | 20/hour                                |
| `POST /invitations/validate` | 20/min                                 |

### Public Endpoints

| Endpoint                       | Limit                  |
| ------------------------------ | ---------------------- |
| `GET /pets/placement-requests` | `public-api` (150/min) |
| `GET /pets/featured`           | `public-api` (150/min) |
| `GET /pet-types`               | `public-api` (150/min) |

### Auth Endpoints (Fortify)

| Endpoint                                | Limit         |
| --------------------------------------- | ------------- |
| `POST /login`                           | 5/min (prod)  |
| `POST /register`                        | 10/min (prod) |
| `POST /forgot-password`                 | 5/min (prod)  |
| `POST /email/verification-notification` | 6/min         |
| `GET /email/verify/{id}/{hash}`         | 6/min         |

## What Is NOT Throttled

- **Webhook endpoints** (`/webhooks/mailgun`, `/webhooks/telegram`) — external services may retry on 429, and they have their own signature verification.
- **Admin routes** — admins need operational freedom; the group-level default is sufficient.
- **Public individual-resource GETs** (e.g., `GET /pets/{pet}`) — require knowing IDs, less useful for bulk scraping.
- **Notification polling** (`GET /notifications`, `GET /msg/unread-count`) — the group default (300/min) is generous enough for normal polling intervals.

## Environment-Aware Behavior

In `local`, `testing`, and `e2e` environments, the named `authenticated` and `public-api` limiters use 300 req/min instead of their production values.

Minute-based route throttles also relax to 300 req/min in those environments. This keeps E2E and local workflows from tripping production-oriented write limits, while longer-window business caps such as invitation-per-hour limits remain unchanged.

## Frontend Handling

The frontend Axios interceptor returns errors on 429 responses like any other HTTP error. This includes minute-based throttles and daily API quota errors.

Daily quota denials are also written to `api_request_logs`, so support/admin tooling sees the same request trail as successful API calls.

## Business-Level Limits

Some limits are enforced at the application layer, not via HTTP middleware:

- **Invitations**: 10 per user per day (revoked invitations are excluded from this count)
- **Relationship invitations**: Validated by policy rules beyond just rate limiting
- **Daily API quota (plan-aware)**:
  - Regular users: 1000 requests/day (configurable)
  - Premium users: unlimited
  - Reset boundary: UTC calendar day
  - Over-quota response: `429` with `data.error_code = API_DAILY_QUOTA_EXCEEDED` and `data.quota.reset_at_utc`

See [Invitation System](./invites.md) for details on invitation-specific limits.
