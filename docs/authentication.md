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
- POST /api/demo/login-token — Issues a short-lived, single-use token for the configured demo user.
- GET /demo/login?token=... — Consumes the token, logs the demo user into the web session, regenerates the session, and redirects to `/`.

Notes:

- Standard Fortify verify endpoint (/email/verify/{id}/{hash}) returns HTML and performs redirects. The API variant exists to simplify SPA and tests.

## Sanctum Flows (React SPA)

1. CSRF bootstrap

- GET /sanctum/csrf-cookie (withCredentials: true)

2. Login

- POST /login (withCredentials: true)
- Sanctum issues an XSRF-TOKEN + laravel_session cookie for the SPA’s origin
- After a successful login, the frontend immediately requests `GET /sanctum/csrf-cookie` again.
  This re-primes the browser with the fresh XSRF cookie that belongs to the
  regenerated authenticated session, so any write request fired right after
  login does not accidentally use a stale pre-login token.
  If that second CSRF refresh fails, the SPA keeps the login successful and
  only logs a warning, because the authentication itself already succeeded.

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

### OAuth Users (No Password)

- Users registered via Google OAuth initially have no local password set (`password` is null).
- The `GET /api/users/me` endpoint returns a `has_password` boolean.
- If `has_password` is `false`, the Settings page replaces the "Change password" button with a "Set password" prompt.
- This prompt guides the user to use the **Forgot Password** flow to set their initial password via a secure email link.
- **After password reset**, OAuth users are automatically logged out and their session is invalidated to ensure a clean login with the new password.
- Authenticated users attempting to use the password change API without a password set will receive a 422 validation error directing them to the password reset flow.

## Tokens (Programmatic Access)

- Use Sanctum Personal Access Tokens when the client can’t use cookies (CLI/mobile)
- API routes protected by auth:sanctum will accept either a session-authenticated user or a bearer token from a PersonalAccessToken

## Public Demo Login

The app supports a promo-site-to-demo iframe login flow without exposing reusable credentials in frontend code.

- `POST /api/demo/login-token` returns `{ token, login_url, expires_at }` in the standard API envelope.
- Tokens are opaque, cache-backed, single-use, and expire after `DEMO_LOGIN_TOKEN_TTL_SECONDS` (default: 120 seconds).
- `GET /demo/login?token=...` consumes the token, authenticates the configured demo user with the normal `web` guard, regenerates the session, and redirects to `DEMO_LOGIN_REDIRECT_PATH` (default: `/`).
- The demo user is resolved by `DEMO_USER_EMAIL`, not by a hard-coded database ID.
- If the demo user is missing, token issuance returns `503 Demo is currently unavailable.`
- Production throttles for the live demo are intentionally higher than standard auth flows: `POST /api/demo/login-token` is `50/min`, `GET /demo/login` is `100/min`, the shared authenticated demo session bucket is `300/min`, and public listing endpoints such as `GET /pets/placement-requests` use the `public-api` limiter at `150/min`.

Operational notes:

- This flow is designed for same-parent-domain deployments such as `project.meo-mai-moi.com` embedding `dev.meo-mai-moi.com`.
- Start with host-only session cookies for the demo app. Only broaden `SESSION_DOMAIN` if you confirm you truly need cross-subdomain cookie sharing.
- If your iframe context needs it in real browsers, set `SESSION_SAME_SITE=none` and `SESSION_SECURE_COOKIE=true`.
- The token is still a bearer capability while it exists, so keep TTL short and avoid logging full URLs in observability tooling when possible.

## Testing Notes

- Tests run against PostgreSQL; SQLite is not supported
- Email verification tests use the API verify route (api.verification.verify) for stable JSON responses
- For SPA-style tests, ensure sanctum/csrf-cookie is requested prior to login to establish CSRF state

## Environment and SPA routing

- `FRONTEND_URL` must point to your SPA origin (e.g., `https://app.example.com` or `http://localhost:5173`).
- `SANCTUM_STATEFUL_DOMAINS` must include the SPA host (no scheme, include port for non-443), e.g., `localhost:5173,localhost` or `app.example.com,app.example.com:443`.
- `SESSION_DOMAIN` should be the parent domain (e.g., `.example.com`) when sharing cookies across subdomains; set `SESSION_SECURE_COOKIE=true` in HTTPS environments.
- Demo login variables:
  - `DEMO_USER_EMAIL`
  - `DEMO_USER_NAME`
  - `DEMO_USER_PASSWORD`
  - `DEMO_LOGIN_TOKEN_TTL_SECONDS`
  - `DEMO_LOGIN_REDIRECT_PATH`
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

## Telegram authentication

Telegram auth uses three complementary paths: **Mini App auto-auth** for users inside the Telegram app, **bot-based account creation** for users who discover the bot directly, and a **"Sign in with Telegram" button** on login/register pages that redirects users to the bot.

### Mini App authentication

- Endpoint: `POST /api/auth/telegram/miniapp` (rate limited)
  - Request body:
    - `init_data` (required): raw `Telegram.WebApp.initData`
    - `invitation_code` (optional): used when invite-only mode is enabled
- Session model: endpoint runs with web session middleware; frontend requests CSRF cookie first so successful Telegram auth persists as a Sanctum session.
- Verification: `HMAC-SHA256(bot_token, "WebAppData")` → `HMAC-SHA256(check_string, secret)`
- Used when the app runs inside Telegram as a Mini App (WebApp context).
- Frontend auto-authenticates on load via `useTelegramMiniAppAuth` hook in `App.tsx`.
- The frontend hook is resilient to delayed Telegram bootstrap (`window.Telegram.WebApp` / `initData` becoming available after initial render) and retries briefly before giving up.
- Validates `auth_date` freshness (10-minute window) and applies short replay protection.

### Token-based authentication (fallback)

Some Telegram clients (notably Desktop on Linux) open `web_app` buttons in their in-app browser without injecting the Mini App WebApp SDK, making `initData` unavailable. To handle this, the bot embeds a one-time login token in the `web_app` button URL.

- When the bot sends an "Open App" `web_app` button for a known user, it generates a random 64-char token, stores it in cache (`telegram-miniapp-login:{token}` → user ID, 30-day TTL), and appends `?tg_token=TOKEN` to the URL.
- Endpoint: `POST /api/auth/telegram/token` (rate limited, web session middleware)
  - Request body: `token` (required, string, 64 chars)
  - Validates token from cache (reusable: `Cache::get`), finds user, logs in via session.
- Logout sets a `sessionStorage` flag (`telegram_auth_disabled`) to prevent auto-auth from re-authenticating. The flag is cleared when a fresh `tg_token` arrives from Telegram (new page open).
- Frontend: `useTelegramMiniAppAuth` hook checks for `tg_token` URL parameter on mount, consumes it (removes from URL via `history.replaceState`), and authenticates via the token endpoint as a fallback when `initData` is not available.
- Auth priority: tg_token (URL fallback, when present) → initData (standard Mini App).

### Bot-based account creation and linking

The `TelegramWebhookController` handles incoming webhook updates (`message` and `callback_query`). The `TelegramWebhookService` registers both update types in `allowed_updates`.

**`/start` or `/start login` (no link token):**

1. Looks up existing user by `telegram_user_id` OR `telegram_chat_id`.
2. **Known user**: auto-links `telegram_chat_id`, enables Telegram notifications, sends "already linked" message with a **web_app button** to open the Mini App (localized via user's `locale`).
3. **Unknown user**: sends a **language selection** keyboard (English, Russian, Ukrainian, Vietnamese). After the user picks a language, shows a welcome message (with a note about linking existing accounts via Settings) and a **"Create new account"** button — all in the chosen language.

- Primary path: deep link URL `https://t.me/<bot_username>?start=create_account`.
- Fallback path (when bot username is not configured): `callback_data: create_account`.

**Callback `lang_en` / `lang_ru` / `lang_uk` / `lang_vi` (language selection):**

- Stores the chosen locale in cache (`telegram-locale:{chatId}`, 30-day TTL).
- Sends the localized welcome message with the "Create new account" button.

**Callback `create_account`:**

- Checks invite-only mode (if on, tells user registration is by invitation only).
- Creates a new account via `TelegramUserAuthService`, sets `telegram_chat_id` and `locale` (from cached language preference), enables Telegram notifications for all notification types.
- Sends confirmation message with a **web_app button** to open the Mini App (user is auto-authenticated via Mini App auth on open).

**`/start create_account` fallback:**

- Handles account creation directly from a deep link when `callback_query` updates are unavailable or not delivered.
- Uses the same creation + linking logic as callback-based `create_account`.

**`/start {token}` (from Settings → Account "Connect Telegram" flow):**

- Validates the link token and expiry.
- Links `telegram_chat_id` to the user, clears the token, enables notifications.
- Sends confirmation with a **web_app button**.

### Web-based Telegram login

Login and register pages show a "Sign in with Telegram" / "Sign up with Telegram" button (only when `telegram_bot_username` is present in public settings, sourced from `TELEGRAM_USER_BOT_USERNAME`). The button links to `https://t.me/<bot_username>?start=login`, which opens Telegram and triggers the bot's `/start login` flow described above. The `login` parameter is treated identically to a bare `/start`.

The GPT connector consent page (`/gpt-connect`) now uses the same Telegram entry point, but with a short-lived resume token: `https://t.me/<bot_username>?start=login_<token>`. The bot resolves that token to a safe frontend path like `/gpt-connect?session_id=...&session_sig=...`, then appends `tg_token=...` when opening the Mini App so Telegram auth can complete and return the user to the consent screen instead of dropping them on the app home page.

### Telegram config matrix

The project uses a user-facing Telegram bot for product features:

- User-facing bot:
  - Purpose: login buttons, Mini App auth, Telegram webhook flow, user notifications
  - Env file: `backend/.env`
  - Variables: `TELEGRAM_USER_BOT_TOKEN`, `TELEGRAM_USER_BOT_USERNAME`

Environment-specific user bot values:

- `local` and `dev`: `OneMoreTestingBot`
- `prod`: `meo_mai_moi_bot`

The ops/deploy bot is the same in all environments: `ServerScratcherBot`.

### User creation behavior

- If a user with matching `telegram_user_id` exists, logs them in and updates profile fields.
- If no `telegram_user_id` match exists, auth falls back to `telegram_chat_id` to re-authenticate already linked accounts opened from bot `web_app` buttons, then backfills `telegram_user_id`.
- Otherwise creates a Telegram-first account (email: `telegram_{id}@telegram.meo-mai-moi.local`) and marks it verified.
- In invite-only mode, registration requires a valid invitation code (Mini App) or is blocked entirely (bot).
- Data stored on user: `telegram_user_id`, `telegram_username`, `telegram_first_name`, `telegram_last_name`, `telegram_photo_url`, `telegram_last_authenticated_at`
- `locale` is set from the cached bot language preference when creating accounts via the bot.

### Frontend integration

- `useTelegramAuth` hook wraps `useTelegramMiniAppAuth` — it only supports Mini App context (no browser-based Telegram auth).
- `isTelegramAvailable` is `true` only when inside a Telegram Mini App with valid `initData`.
- Login and register pages fetch `telegram_bot_username` from `useGetSettingsPublic` to conditionally render the Telegram button.
- The backend exposes that username from `TELEGRAM_USER_BOT_USERNAME` in `backend/.env`; it is no longer managed from admin DB settings.
- The GPT connector consent page also fetches `telegram_bot_username`, plus a short-lived resume token from `POST /api/gpt-auth/telegram-link`, so Google and Telegram sign-in can resume the OAuth consent flow after the external round-trip.
- Telegram account linking is available in Settings → Account via the `TelegramNotificationsCard` component.
  - In Mini App context, linking is direct via `POST /api/telegram/link-miniapp` using current `init_data` (no redirect needed).
  - In browser context, linking uses the token flow (`POST /api/telegram/link-token`) and opens the bot.

### Bot message i18n

All Telegram bot messages are translated via Laravel's `messages.telegram.*` keys in `backend/lang/{en,ru,uk,vi}/messages.php`. Locale resolution order:

1. User's `locale` field (if user is known)
2. Cached `telegram-locale:{chatId}` (set when user picks a language from the selection keyboard)
3. App default locale (`config('app.locale')`, English)

The `choose_language` prompt is intentionally multilingual (all 4 languages in one string) since it's shown before any language preference is established.

### Key files

- `backend/app/Http/Controllers/Auth/TelegramTokenAuthController.php` — One-time token auth for Mini App fallback
- `backend/app/Http/Controllers/GptAuth/CreateTelegramLoginLinkController.php` — Short-lived Telegram resume token for GPT connector consent
- `backend/app/Services/TelegramMiniAppAuthService.php` — Mini App signature verification
- `backend/app/Services/TelegramUserAuthService.php` — Shared user find/create/login logic
- `backend/app/Http/Controllers/Telegram/TelegramWebhookController.php` — Bot webhook handling (start command, callback queries, account creation, web_app buttons)
- `backend/app/Http/Controllers/Telegram/LinkTelegramMiniAppController.php` — Direct linking for authenticated Mini App sessions (`/api/telegram/link-miniapp`)
- `backend/app/Services/TelegramWebhookService.php` — Webhook registration (allowed_updates: message, callback_query)
- `frontend/src/hooks/use-telegram-auth.ts` — Frontend hook (Mini App only)
- `frontend/src/hooks/use-telegram-miniapp-auth.ts` — Mini App detection and auto-auth
- `frontend/src/components/auth/LoginForm.tsx` — "Sign in with Telegram" button (web flow)
- `frontend/src/pages/auth/RegisterPage.tsx` — "Sign up with Telegram" button (web flow)
- `frontend/src/pages/auth/GptConnectPage.tsx` — GPT consent page with Google/Telegram resume links
- `frontend/src/components/notifications/TelegramNotificationsCard.tsx` — Account linking UI (Settings → Account)
