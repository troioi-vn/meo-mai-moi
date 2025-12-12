# Authentication (Fortify + Jetstream)

This document describes how authentication works after migrating from the custom system to Laravel Fortify and Jetstream, and how it integrates with the React SPA via Sanctum.

## Overview

- Identity provider: Laravel Fortify (backed by Jetstream config)
- Session auth: Sanctum stateful cookies for SPA flows
- Token auth: Sanctum Personal Access Tokens for programmatic access
- Email verification: Required by default, standard Fortify flow plus an API verification route for SPA usage

## Core Endpoints

All Fortify routes are registered under the web middleware group. Your React SPA communicates via Sanctum with stateful cookies.

- POST /login — Fortify login
- POST /logout — Fortify logout
- POST /register — Fortify registration
- POST /forgot-password — Fortify request reset link
- POST /reset-password — Fortify perform reset
- GET /email/verify — Verification notice page (HTML)
- GET /email/verification-notification — Resend verification (throttled)

Additional endpoints added for SPA support:

- GET /api/email/verify/{id}/{hash} — Signed, auth:sanctum; returns JSON for SPA.
  - Name: api.verification.verify
  - Middleware: signed, throttle, auth:sanctum
- GET /api/email/status — JSON: { verified: boolean }

Notes:

- Standard Fortify verify endpoint (/email/verify/{id}/{hash}) returns HTML and performs redirects. The API variant exists to simplify SPA and tests.

## Sanctum Flows (React SPA)

1. CSRF bootstrap

- GET /sanctum/csrf-cookie (withCredentials: true)

2. Login

- POST /login (withCredentials: true)
- Sanctum issues an XSRF-TOKEN + laravel_session cookie for the SPA’s origin

3. Authenticated requests

- Include credentials (withCredentials) and XSRF header automatically via axios (if configured)

4. Logout

- POST /logout (withCredentials: true)

5. Email verification

- After registration or login of an unverified user, the SPA should show a verification prompt
- Use GET /api/email/status to poll or reflect verification
- When clicking the verification link (from email), the route can be:
  - Web: /email/verify/{id}/{hash} → redirects/HTML
  - API: /api/email/verify/{id}/{hash} (recommended for SPA) → JSON 200 { verified: true }

## Middleware

- EnsureEmailIsVerified (API):

  - For API routes that require verified users, this middleware checks the bearer token or sanctum session user and returns 403 JSON if unverified.

// ForceWebGuard previously ensured the web guard on web routes; with SPA-only UI and Fortify, it is not required for core flows.

## Email Verification Behavior

- Registration does not log an unverified user into the web session
- SPA gets a clean JSON response with messaging and can show a “Verify your email” prompt
- Resend endpoint is throttled and follows Fortify defaults

## Password Reset & Change

- Fortify’s forgot-password and reset-password endpoints are used
- CustomPasswordReset mailable integrates with EmailConfiguration/EmailLog
- Tests avoid logging to EmailLog when no active configuration is present
- Logged-in users change their password from the React SPA via the **Settings → Account** tab
  - The account tab shows a "Change password" button that opens a modal dialog
  - The modal uses the same backend `changePassword` flow as the legacy account page
  - On success, the user is logged out and redirected to `/login` for security

## Tokens (Programmatic Access)

- Use Sanctum Personal Access Tokens when the client can’t use cookies (CLI/mobile)
- API routes protected by auth:sanctum will accept either a session-authenticated user or a bearer token from a PersonalAccessToken

## Testing Notes

- Tests run against PostgreSQL; SQLite is not supported
- Email verification tests use the API verify route (api.verification.verify) for stable JSON responses
- For SPA-style tests, ensure sanctum/csrf-cookie is requested prior to login to establish CSRF state

## Environment and SPA routing

- `FRONTEND_URL` must point to your SPA origin (e.g., `https://app.example.com` or `http://localhost:5173`).
- `SANCTUM_STATEFUL_DOMAINS` must include the SPA host (no scheme, include port for non-443), e.g., `localhost:5173,localhost` or `app.example.com,app.example.com:443`.
- `SESSION_DOMAIN` should be the parent domain (e.g., `.example.com`) when sharing cookies across subdomains; set `SESSION_SECURE_COOKIE=true` in HTTPS environments.
- Google OAuth variables:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` — e.g. `https://dev.meo-mai-moi.com/auth/google/callback`
- SPA entry routes:
  - When `FRONTEND_URL` is same-origin as the backend, GET `/login` and `/register` serve the SPA index so the React router renders those pages.
  - When `FRONTEND_URL` is different-origin, those paths 302 redirect to the SPA.
- Password reset web route (`/reset-password/{token}?email=...`) always redirects to `${FRONTEND_URL}/password/reset/...` with a robust fallback to `env('FRONTEND_URL')` (or `http://localhost:5173` in dev).
- Email pre-check endpoint: `POST /api/check-email` returns `{ exists: boolean }` and is throttled and audit-logged.

## Google OAuth login

- Backend
  - Routes: `GET /auth/google/redirect` (stores optional `redirect` param for SPA-safe relative redirects) and `GET /auth/google/callback`.
  - Controller: `GoogleAuthController` (Socialite driver `google`) creates or updates users, keeps password nullable for social signups, saves `google_id` and tokens, and auto-verifies email from Google.
  - Avatar handling: Google avatar URLs are validated (HTTPS, Google-hosted domains only), downloaded with a 5MB size limit, and stored via Spatie MediaLibrary. Only known image types (PNG, GIF, WebP, JPEG) are accepted; unknown types are rejected.
  - Conflicts: if an existing user with the same email but without `google_id` exists, callback redirects to `/login?error=email_exists`.
  - Missing email from Google redirects to `/login?error=missing_email`; unexpected OAuth errors redirect to `/login?error=oauth_failed`.
- Frontend
  - Login page shows “Sign in with Google” linking to `/auth/google/redirect` (passes `?redirect=` when present and safe).
  - On return, `LoginPage` surfaces query errors (`email_exists`, `oauth_failed`, `missing_email`) in the form error banner.
- Environment
  - Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in both `.env` and `.env.docker.example` (redirect URL must match the Google console configuration).
