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

- ForceWebGuard (Web):
  - Ensures the web guard is consistently used on web routes. If a user is authenticated by Sanctum/token, mirrors to web guard for consistent behavior.

## Email Verification Behavior

- Registration does not log an unverified user into the web session
- SPA gets a clean JSON response with messaging and can show a “Verify your email” prompt
- Resend endpoint is throttled and follows Fortify defaults

## Password Reset

- Fortify’s forgot-password and reset-password endpoints are used
- CustomPasswordReset mailable integrates with EmailConfiguration/EmailLog
- Tests avoid logging to EmailLog when no active configuration is present

## Tokens (Programmatic Access)

- Use Sanctum Personal Access Tokens when the client can’t use cookies (CLI/mobile)
- API routes protected by auth:sanctum will accept either a session-authenticated user or a bearer token from a PersonalAccessToken

## Testing Notes

- Tests run against PostgreSQL; SQLite is not supported
- Email verification tests use the API verify route (api.verification.verify) for stable JSON responses
- For SPA-style tests, ensure sanctum/csrf-cookie is requested prior to login to establish CSRF state
