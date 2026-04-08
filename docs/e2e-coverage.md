# E2E Coverage Map

This document tracks the main user-facing flows and whether they are covered by Playwright end-to-end tests.

It is intentionally flow-oriented rather than model-oriented. The goal is to answer:

- Which user promises are protected by E2E tests?
- Which flows still rely only on unit or integration coverage?
- Where should the next Playwright spec go?

## Status Meanings

| Status    | Meaning                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| `covered` | A Playwright test exercises the main happy path of this flow.                                      |
| `partial` | Some part of the flow is covered, but an important success path or mutation path is still missing. |
| `missing` | No meaningful E2E coverage yet.                                                                    |

## Current Coverage

| Area            | User flow                                                               | Priority | Status    | Spec                                                                                                                                | Notes                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth            | Registration page loads                                                 | High     | `covered` | `frontend/e2e/auth.spec.ts`, `frontend/e2e/registration-with-email-verification.spec.ts`                                            | Basic UI coverage exists in two places.                                                                                                          |
| Auth            | Register account, receive verification email, verify account, enter app | High     | `covered` | `frontend/e2e/registration-with-email-verification.spec.ts`                                                                         | Exercises the real MailHog-backed verification flow.                                                                                             |
| Auth            | Login with existing user                                                | High     | `covered` | `frontend/e2e/auth.spec.ts`                                                                                                         | Uses seeded user.                                                                                                                                |
| Auth            | Logout                                                                  | High     | `covered` | `frontend/e2e/auth.spec.ts`                                                                                                         | Covered as part of login/logout flow.                                                                                                            |
| Auth            | Protected route redirects unauthenticated user to login                 | High     | `covered` | `frontend/e2e/pet-creation.spec.ts`, `frontend/e2e/registration-with-email-verification.spec.ts`, `frontend/e2e/navigation.spec.ts` | Covered against `/pets/create` and `/settings/account`.                                                                                          |
| Auth            | Login failure shows error                                               | Medium   | `covered` | `frontend/e2e/navigation.spec.ts`                                                                                                   | Wrong credentials stay on `/login` with visible error.                                                                                           |
| Auth            | Authenticated user redirected away from /login                          | Medium   | `covered` | `frontend/e2e/navigation.spec.ts`                                                                                                   | Verified bounce-back to home.                                                                                                                    |
| Auth            | Password reset: request link                                            | High     | `covered` | `frontend/e2e/password-reset.spec.ts`                                                                                               | Form loads; sends email; shows confirmation with user's address.                                                                                 |
| Auth            | Password reset: full flow via email                                     | High     | `covered` | `frontend/e2e/password-reset.spec.ts`                                                                                               | Request → MailHog capture → follow reset URL → set new password → success → login with new password.                                             |
| Auth            | Password reset: invalid token                                           | Medium   | `covered` | `frontend/e2e/password-reset.spec.ts`                                                                                               | Shows "Invalid Reset Link" with recovery CTA.                                                                                                    |
| Navigation      | 404 page for unknown routes                                             | Medium   | `covered` | `frontend/e2e/navigation.spec.ts`                                                                                                   | Renders 404 heading, description, and working "Go to Homepage" link.                                                                             |
| Pets            | Add pet with minimal required fields                                    | High     | `covered` | `frontend/e2e/pet-creation.spec.ts`                                                                                                 | Core happy path exists.                                                                                                                          |
| Pets            | Add pet validation feedback                                             | Medium   | `covered` | `frontend/e2e/pet-creation.spec.ts`                                                                                                 | Good smoke-level validation coverage.                                                                                                            |
| Pets            | Add pet with different pet type                                         | Medium   | `covered` | `frontend/e2e/pet-creation.spec.ts`                                                                                                 | Covers cat and dog creation paths.                                                                                                               |
| Pets            | Queue offline pet creation and replay on reconnect                      | High     | `covered` | `frontend/e2e/offline-mode.spec.ts`                                                                                                 | Verifies offline create shows queued state, then syncs to a real pet profile link after reconnect.                                               |
| Pets            | Edit pet general info                                                   | High     | `covered` | `frontend/e2e/pet-basic-lifecycle.spec.ts`                                                                                          | Uses the inline profile editor on the General tab.                                                                                               |
| Pets            | Queue offline pet edit and replay on reconnect                          | High     | `covered` | `frontend/e2e/offline-mode.spec.ts`                                                                                                 | Confirms optimistic offline edit persists after reconnect and reload.                                                                            |
| Pets            | Delete pet                                                              | High     | `covered` | `frontend/e2e/pet-basic-lifecycle.spec.ts`                                                                                          | Uses the Status tab danger zone and confirm dialog.                                                                                              |
| Pets            | Queue offline pet deletion and replay on reconnect                      | High     | `covered` | `frontend/e2e/offline-mode.spec.ts`                                                                                                 | Confirms offline removal hides the pet immediately and stays deleted after reconnect.                                                            |
| Pet photos      | Upload pet profile photo                                                | High     | `covered` | `frontend/e2e/pet-photos.spec.ts`                                                                                                   | Uses the inline General tab editor upload control.                                                                                               |
| Pet photos      | Add extra gallery photo                                                 | High     | `covered` | `frontend/e2e/pet-photos.spec.ts`                                                                                                   | Confirms the pet reaches a multi-photo state in the real browser flow.                                                                           |
| Pet photos      | Set gallery photo as primary/avatar                                     | Medium   | `covered` | `frontend/e2e/pet-photos.spec.ts`                                                                                                   | Uses the avatar modal action on a non-primary photo.                                                                                             |
| Pet photos      | Delete pet photo                                                        | High     | `covered` | `frontend/e2e/pet-photos.spec.ts`                                                                                                   | Deletes through the avatar modal and verifies the gallery count updates.                                                                         |
| Weight records  | Add weight record                                                       | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   | Uses the inline add form and edit-mode list.                                                                                                     |
| Weight records  | Edit weight record                                                      | Medium   | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Weight records  | Remove weight record                                                    | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Vaccinations    | Add vaccination record                                                  | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   | Covers the main upcoming vaccination flow.                                                                                                       |
| Vaccinations    | Edit vaccination record                                                 | Medium   | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Vaccinations    | Remove vaccination record                                               | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Medical records | Add medical record                                                      | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Medical records | Edit medical record                                                     | Medium   | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Medical records | Remove medical record                                                   | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Medical records | Add or remove medical record attachment photo                           | Medium   | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   | Uses the medical form attachment control and deletes through the health-record photo modal.                                                      |
| Microchips      | Add microchip                                                           | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Microchips      | Edit microchip                                                          | Medium   | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Microchips      | Remove microchip                                                        | High     | `covered` | `frontend/e2e/pet-health.spec.ts`                                                                                                   |                                                                                                                                                  |
| Pet people      | Generate invitation link                                                | High     | `covered` | `frontend/e2e/pet-people.spec.ts`                                                                                                   | Covers creating a role-scoped share link from the People section.                                                                                |
| Pet people      | Revoke or remove invitation link                                        | High     | `covered` | `frontend/e2e/pet-people.spec.ts`                                                                                                   | Covers revoking a pending invitation from the People section.                                                                                    |
| Pet people      | Accept invitation after authentication redirect                         | High     | `covered` | `frontend/e2e/pet-people.spec.ts`                                                                                                   | Covers invite page redirect to login, return to invite page, and successful acceptance.                                                          |
| Profile         | Account settings page loads                                             | Medium   | `covered` | `frontend/e2e/settings-account.spec.ts`                                                                                             | Smoke-level shell coverage exists.                                                                                                               |
| Profile         | Upload avatar                                                           | Medium   | `covered` | `frontend/e2e/settings-account.spec.ts`                                                                                             |                                                                                                                                                  |
| Profile         | Replace avatar                                                          | Medium   | `covered` | `frontend/e2e/settings-account.spec.ts`                                                                                             |                                                                                                                                                  |
| Profile         | Remove avatar                                                           | Medium   | `covered` | `frontend/e2e/settings-account.spec.ts`                                                                                             |                                                                                                                                                  |
| Profile         | Change password                                                         | Medium   | `partial` | `frontend/e2e/settings-account.spec.ts`                                                                                             | Dialog and validation are covered; confirm the full success path before marking covered.                                                         |
| Profile         | Edit profile details                                                    | High     | `covered` | `frontend/e2e/profile.spec.ts`                                                                                                      | Covers the real account name-edit flow and persistence after reload.                                                                             |
| Profile         | Set real email for Telegram placeholder account and verify it           | High     | `covered` | `frontend/e2e/profile.spec.ts`                                                                                                      | Covers email entry, confirmation dialog, verification email, and successful verification.                                                        |
| Helper profiles | Create helper profile                                                   | High     | `covered` | `frontend/e2e/helper-profile-creation.spec.ts`                                                                                      | Covers the authenticated create flow and redirect to the created profile.                                                                        |
| Helper profiles | Public helpers listing shows only publicly visible profiles             | High     | `covered` | `frontend/e2e/helper-profile-creation.spec.ts`                                                                                      | Confirms seeded approved helpers appear on `/helpers`, newly created public helpers appear immediately, and private helpers stay hidden.         |
| Helper profiles | Public helper detail page is accessible only for publicly visible items | High     | `covered` | `frontend/e2e/helper-profile-creation.spec.ts`                                                                                      | Confirms seeded approved helpers open on `/helpers/:id`, newly created public helpers open immediately, and private helpers return public `404`. |

## Recommended Spec Layout

Keep specs organized by user journey instead of by backend resource or component.

Recommended target structure:

| Spec                                                        | Primary responsibility                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `frontend/e2e/auth.spec.ts`                                 | Login, logout, protected-route redirect checks.                                                             |
| `frontend/e2e/registration-with-email-verification.spec.ts` | Successful registration and verification journey, plus a small number of failure states.                    |
| `frontend/e2e/pet-creation.spec.ts`                         | Creating pets and create-form validation.                                                                   |
| `frontend/e2e/pet-basic-lifecycle.spec.ts`                  | Edit pet general info and delete pet.                                                                       |
| `frontend/e2e/offline-mode.spec.ts`                         | Offline pet create, edit, and delete queue/replay behavior across reconnect.                                |
| `frontend/e2e/pet-photos.spec.ts`                           | Upload gallery photo, set primary photo, delete photo.                                                      |
| `frontend/e2e/pet-health.spec.ts`                           | Weight, vaccination, medical record, and microchip CRUD happy paths.                                        |
| `frontend/e2e/pet-people.spec.ts`                           | Invitation link creation and removal in the People section.                                                 |
| `frontend/e2e/profile.spec.ts`                              | Profile details editing; keep avatar and password here over time if you want a single profile-focused file. |
| `frontend/e2e/helper-profile-creation.spec.ts`              | Helper profile creation plus public-directory visibility and public-detail access rules.                    |
| `frontend/e2e/navigation.spec.ts`                           | 404 page, auth guard redirects, login-when-authenticated bounce, login failure.                             |
| `frontend/e2e/password-reset.spec.ts`                       | Forgot-password form, full reset flow via MailHog email, invalid token error.                               |

## Good Testing Practice For This Stack

### Prefer one true auth journey, then authenticated setup

For this stack, it is better to:

- keep a small number of explicit auth tests that really verify login, logout, registration, and redirect behavior
- avoid repeating full UI login in every unrelated test
- use authenticated Playwright setup for the rest of the suite

Why this fits here:

- login is already subject to rate limiting
- repeated UI auth makes the suite slower and more fragile
- your existing helper pattern already hints at this problem

The main exception is when login is part of the product promise being tested, such as:

- redirecting an unauthenticated user back into a protected flow
- invitation acceptance that depends on authentication
- post-registration onboarding

### Prefer happy-path CRUD in E2E, edge cases elsewhere

For pet records and profile editing:

- use E2E for the main browser journey and one destructive path
- keep deep validation matrices in component, integration, or backend tests

That gives you confidence without turning Playwright into the slowest possible test layer.

## Suggested Next Implementation Order

1. Consider moving legacy avatar/password checks from `settings-account.spec.ts` into `profile.spec.ts` when you want one profile-focused file.
2. Decide whether verified-user email-change rejection needs its own E2E, or should remain backend/integration coverage only.
3. Revisit whether invitation decline deserves E2E coverage or can stay below the browser layer.
4. Add rehoming/adoption flow coverage once the feature stabilises.
5. Add admin route access guard tests (non-admin blocked from admin routes).

## Maintenance Rule

When a new user-facing feature ships:

1. Add or update the flow in this file.
2. Mark whether E2E coverage is required.
3. Link the spec once coverage exists.

This keeps the document lightweight and makes coverage gaps obvious during feature work.
