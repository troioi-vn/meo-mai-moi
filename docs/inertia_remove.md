# Removing Inertia Completely (keeping Fortify + Jetstream API features)

This guide removes Inertia/Vue UI from the backend while preserving Fortify and Jetstream features for authentication (login, registration, password reset, email verification, 2FA) that your React SPA consumes via API.

Goal:

- React SPA remains the only UI.
- Backend serves API endpoints plus minimal redirects (e.g., email/password links → SPA).
- No Vue/Inertia assets or Node toolchain in the backend.

Out of scope:

- We keep Jetstream installed for API feature wiring (e.g., Features::api) but disable any UI usage.

---

## 1) Configure Fortify for SPA-only (no views)

Edit `backend/config/fortify.php`:

- Set:
  - `'views' => false,`
  - Optionally set `'home' => '/'` (not strictly required since we redirect to the SPA in response classes, but it avoids confusion).

Result:

- Fortify stops registering view routes (e.g., GET /login, /register UI pages).
- SPA will handle all UI and call Fortify’s JSON endpoints.

## 2) Keep only the minimal web redirects

File: `backend/routes/web.php`

- Keep the SPA entry at `/` that returns your `welcome.blade.php` (which your frontend build script updates with asset tags).
- Keep redirect for password reset links to the SPA:
  - `GET /reset-password/{token}` → redirect to `${FRONTEND_URL}/password/reset/{token}?email=...`
- Keep `/unsubscribe` view if you use it.
- Remove any Inertia usage:
  - Delete `use Inertia\\Inertia;`
  - Remove `Inertia::render(...)` routes (e.g., Welcome, Dashboard). If tests require a named `dashboard` route, keep it but redirect to the SPA URL instead of rendering an Inertia page.

## 3) Remove backend Inertia UI source

Delete these folders/files (if present):

- `backend/resources/js/**` (Vue components and app.js)
- `backend/resources/css/app.css`
- `backend/resources/views/app.blade.php` (Inertia mount layout)

Keep:

- `backend/resources/views/welcome.blade.php` (SPA entry updated by frontend build script)
- Any non-Inertia Blade views you rely on (like `unsubscribe.blade.php`).

## 4) Remove backend Node toolchain (Vite/Tailwind for Inertia)

Delete these files in `backend/`:

- `package.json` and lockfile (if any)
- `vite.config.js`
- `postcss.config.js`
- `tailwind.config.js`

Also remove any Ziggy JS usage (only used by Inertia pages):

- Any `ZiggyVue` usage under `resources/js` (already deleted in step 3).

## 5) Composer cleanup (PHP packages)

Edit `backend/composer.json` and remove:

- `"inertiajs/inertia-laravel"`
- `"tightenco/ziggy"`

Then run inside the backend container:

```bash
composer update inertiajs/inertia-laravel tightenco/ziggy
php artisan config:clear
php artisan route:clear
```

Note:

- Jetstream stays installed for API feature wiring (`Features::api`) but you won’t use its UI.
- `config/jetstream.php` can keep `'stack' => 'inertia'` without harm since we removed all Inertia usage. If desired, add a comment that only API features are used.

## 6) Fortify responses → SPA redirects (already implemented)

We already customized Fortify responses to redirect into the SPA for non-JSON requests:

- `backend/app/Http/Responses/Auth/LoginResponse.php`: non-JSON → `redirect()->intended(FRONTEND_URL)`
- `backend/app/Http/Responses/Auth/RegisterResponse.php`: non-JSON → `redirect()->to(FRONTEND_URL)`

This ensures legacy browser hits don’t render backend pages.

## 7) Dockerfile cleanup

Edit `backend/Dockerfile`:

- Remove the “Build Backend Inertia assets” section (Node install and `npm run build` in `/app/backend`).
- Keep the frontend build stage as-is (it copies SPA assets into `backend/public/build` via your existing scripts).
- Ensure the final image does not expect or reference `public/build-inertia` (no longer needed since Inertia is removed).

## 8) Sanity checks

- Rebuild containers and reseed (optional for local):

```bash
./utils/deploy.sh --fresh --seed
```

- Confirm:
  - `/` serves the SPA.
  - `/login` and `/register` do NOT render backend pages (Fortify views disabled). SPA should link to its own routes and call Fortify endpoints.
  - Registration/login via SPA works; non-JSON redirects (if any) go to FRONTEND_URL.
  - Forgot password flow: email link opens SPA password reset route (redirect via `web.php`), and reset works.
  - Email verification: API verify route and status endpoint work; web verification link redirects to SPA if you wired `verifyWeb` that way.
  - 2FA (if enabled): SPA calls Fortify endpoints; ensure UI exists on SPA side for the challenge.

## 9) Optional cleanups

- Remove any tests that assert Inertia pages exist (replace with SPA-focused tests or API contract tests).
- Update docs to clarify the backend is API-only for UI, with Fortify and Jetstream limited to features (no UI stack).

---

## Quick rationale

- Fortify provides the auth endpoints (login, register, password reset, email verification, 2FA).
- Jetstream is retained for feature wiring (e.g., API features) but we’re not using its UI.
- All UI lives in the React SPA (`frontend/`), keeping a clean separation.
- Removing Inertia and the backend Node/Vite setup reduces container complexity and avoids mixing UI tech in the backend.

## Rollback note

If you ever want to bring back Inertia pages for admin-only screens, you can reintroduce the minimal Node/Vite setup under `backend/` and re-enable Fortify views—but that’s fully optional and independent of the SPA.
