# Inertia Rollout Plan (Jetstream + Vue) alongside React SPA

This document outlines how to introduce Jetstream’s Inertia (Vue) stack while maintaining the current React SPA. The goal is to avoid disruption, leverage Jetstream-provided features, and optionally migrate screens gradually.

## Why Coexistence

- Keep the current React SPA for most user-facing flows
- Adopt Inertia + Vue selectively (e.g., dashboard, account/security pages, admin tools)
- Reuse the same backend: Fortify auth, Sanctum sessions, policies, and services

## High-Level Architecture

- Backend (Laravel):

  - Fortify/Jetstream provides auth scaffolding
  - Inertia handles server-driven pages under web routes
  - API endpoints continue to power the React SPA

- Frontend:
  - React SPA (existing) served as static assets (Vite) and communicates via API
  - Inertia + Vue mounted for server-rendered pages (Jetstream defaults)

## Route Separation

- Keep clear separation by path prefixes:
  - React SPA root: `/` and `/app/*` (current behavior)
  - Inertia area: `/dashboard`, `/account/*`, or `/admin/inertia/*`

Examples:

- React SPA continues to hit `/api/*` endpoints
- Inertia responses return `Inertia::render(...)` and are protected via `web` and `auth` middleware

## Guards & State

- Sanctum mediates session state; both React and Inertia share the same session
- For web routes, use `ForceWebGuard` to ensure consistent guard behavior
- For API routes requiring verification, use `EnsureEmailIsVerified`

## Build & Assets

- React SPA (frontend/) keeps its Vite build and dev server
- Jetstream/Inertia scaffolding lives under `backend/resources/js` and uses Laravel Vite for dev/build
- Production: either
  - Build both and serve React assets from the backend image, or
  - Keep two builds and serve via Nginx with path routing to each set of assets

## Minimal Coexistence Setup Steps

1. Keep Jetstream installed (done) but limit to auth + minimal views

   - Leave `backend/resources/views` and `backend/resources/js` from Jetstream in place

2. Ensure React SPA routing remains the default for `/` paths

   - Nginx or Laravel route definition should send `/` to the SPA index asset

3. Add Inertia entry points

   - Define `/dashboard` route with `->middleware(['auth', 'verified'])`
   - Return `Inertia::render('Dashboard')`

4. Shared props

   - Use `Inertia::share` (e.g., auth user, locale, flash messages)

5. CSRF and sessions
   - React SPA continues to call `/sanctum/csrf-cookie` → `/login`
   - Inertia uses the same session automatically (web guard)

## Recommended First Screens in Inertia

- Account security (2FA, password update) leveraging Jetstream
- Minimal dashboard with user info
- Admin/internal tooling screens that benefit from server-rendered forms

## Gradual Migration (Optional)

- New features → Inertia screens by default
- High-churn or complex React pages: migrate later or keep in React
- Keep API contracts stable for React until migration is complete

## Testing

- Feature tests for Inertia pages using standard Laravel HTTP tests
- Keep existing frontend tests for React SPA (Vitest/Playwright)
- E2E: add a small set of Playwright specs for the `/dashboard` and account pages (optional)

## Risks & Mitigations

- Duplicate design systems (Vue vs React UI)
  - Mitigation: Keep Inertia pages minimal; reuse Tailwind utilities and shared CSS
- Asset collisions
  - Mitigation: Separate build outputs and ensure distinct mount points
- Auth inconsistencies
  - Mitigation: Standardize on Fortify/Sanctum; use `ForceWebGuard` on web routes and `EnsureEmailIsVerified` on API routes

## Acceptance Criteria for Phase 1

- `/dashboard` Inertia page accessible to authenticated users
- React SPA remains fully functional on `/` routes
- Shared session state: logging in from SPA also authenticates `/dashboard`
- Email verification enforced consistently for both
