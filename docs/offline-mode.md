# Offline Mode

Product and engineering contract for what offline mode does and does not promise in Meo Mai Moi.

Use this document when deciding UI behavior, writing tests, or scoping offline work. It separates **what ships today** from **what the roadmap targets** so we do not overclaim.

Related references:

- [Architecture](./architecture.md) — technical overview of offline auth, query persistence, and sync UI
- [Authentication](./authentication.md) — cached identity, offline session rules, and reconnect cleanup
- [API Conventions](./api-conventions.md) — response envelope, `204` behavior, and generated-client rules
- [Development Guide](./development.md) — local setup, PWA icons/manifests, and test commands
- [Philosophy](./philosophy.md) — PWA-first delivery without app-store gatekeepers

---

## Product goal

A signed-in user who recently loaded their pet data should be able to open the installed PWA offline, see cached data, make safe offline edits where supported, see what is pending or failed, and have work reconcile automatically on reconnect.

Offline mode is a reliability feature for pet care workflows, not a full replica of every product surface. See [Philosophy](./philosophy.md): the app stays free, web-first, and focused on rescue and ongoing care rather than engagement tricks.

---

## Feature matrix

Legend:

| Column              | Meaning                                                         |
| ------------------- | --------------------------------------------------------------- |
| **Today**           | Implemented and covered by current code/tests                   |
| **Target**          | Planned offline-roadmap behavior; not a promise until shipped   |
| **Online required** | Intentionally needs a live server; do not queue or fake success |

### Offline-first (read + queued write)

| Feature                                    | Today                                                                                                    | Target                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Pet list / profile view                    | Read from persisted TanStack Query cache when previously fetched                                         | Same; keep cache allowlist explicit                                       |
| Pet create / edit / delete / status change | Queued via persisted React Query mutations with optimistic cache updates; replays on reconnect           | Migrate durable writes onto shared operation queue with idempotency keys  |
| Pet photos                                 | Durable IndexedDB upload queue with retry/backoff; pending photos promote after offline pet create syncs | Same queue on shared `queue-core`; clearer failed-state UX in sync center |
| Weights                                    | **Not offline-capable** — online API calls only                                                          | Queue CRUD with conflict-light handling                                   |
| Vaccinations                               | **Not offline-capable**                                                                                  | Queue metadata CRUD; file attachments via media queue                     |
| Medical records                            | **Not offline-capable**                                                                                  | Queue metadata; files via media queue after record ID mapping             |
| Habits                                     | **Not offline-capable**                                                                                  | Queue check-ins/edits with merge/idempotent day semantics                 |

### Cached read-only

| Feature                               | Today                                                             | Target                                                     |
| ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Pet types                             | Persisted when previously fetched (needed for offline pet create) | Same                                                       |
| Categories                            | Persisted when previously fetched                                 | Same                                                       |
| Featured / public pet views           | Persisted under allowlisted query prefixes                        | Same                                                       |
| Helper / public discovery surfaces    | Available only if previously fetched and still within cache TTL   | Same; no new offline write paths                           |
| My Pets sections / pet detail queries | Persisted for authenticated users under allowlisted prefixes      | Same; projections will merge pending ops into cached reads |

These reads come from TanStack Query persistence, not from Workbox runtime API caching.

### Online required

Do **not** add offline queues, optimistic success, or silent deferral for these domains:

| Feature                                | Why                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Placement / adoption                   | Multi-party workflow, server state machine, and notifications must be authoritative     |
| Messaging                              | Real-time delivery and read receipts require live connectivity                          |
| Invitations                            | Token acceptance and relationship changes are security-sensitive                        |
| Auth / account / security              | Login, logout, password, email verification, account deletion, GPT connect              |
| Admin / moderation                     | Filament and privileged actions must never replay from local queues                     |
| City autocomplete / city creation      | Pet create can proceed without a city offline, but city lookup/create stays online-only |
| Notifications bell / push registration | Delivery and device registration require server reachability                            |

Routes wrapped in `OfflineAwareRoute` show a connection-lost state when offline and no page-level cached data is available. Pet management routes are intentionally **not** wrapped that way so cached pet workflows keep working.

---

## Implemented today

The following behavior is in production code now (Phase 0 correctness work is largely complete):

### Reads and session

- **PWA cold start** loads the precached React app shell via Workbox (`registerType: 'prompt'`).
- **Cached auth identity** (24-hour TTL, versioned) lets a recently authenticated user reach pet routes offline. See [Authentication](./authentication.md).
- **Persisted query cache** (`frontend/src/lib/query-cache.ts`) stores an allowlisted slice of TanStack Query data in IndexedDB for 24 hours: my-pets sections, pet detail prefixes, pet types, categories, and featured pets.
- **`useOfflinePetSession`** treats a user with persisted my-pets data as having a pet session while offline, even before live auth revalidation finishes.

### Writes and sync

- **Pet mutations** (create, edit, delete, status change) use `networkMode: 'online'` mutations that pause offline, persist in the mutation cache, and resume via `resumeOfflinePetMutations` on reconnect.
- **Optimistic pet cache updates** keep list/detail views coherent while mutations are pending.
- **Media upload queue** (`frontend/src/lib/media-upload-queue.ts`) durably stores photo uploads with `queued | uploading | error` states, exponential backoff, and online resubscription. Retryable failures stay queued for another attempt; permanent failures show an error and are removed.
- **Reconnect handling** (`use-sync-status.ts`) resumes pet mutations, processes the upload queue, shows syncing/complete toasts, promotes pending photos after offline pet create, and warns on `beforeunload` when uploads are still pending.

### Pending visibility

- **`OfflineBadge`** uses `useUnifiedPendingCount()` to combine TanStack pending mutations **and** queued media uploads.
- **Online state** flows through TanStack `onlineManager` via `useNetworkStatus()` (not ad hoc `navigator.onLine` checks in feature code).

### PWA updates

- Service worker updates are **prompt-based**, not surprise reloads. Focus regain checks for updates but does not force reload unless `VITE_FORCE_RELOAD_ON_UPDATE=true` or the user confirms an update.

### Privacy cleanup

On logout, account deletion, or authenticated user switch, `clearAuthenticatedAppState` clears:

- TanStack Query memory cache and persisted query store
- Cached auth identity
- Media upload queue (including blob previews)

Future operation-queue stores must hook into the same cleanup path.

### Known limits today

- No dedicated **sync center** page; pending work is visible via badge and toasts only.
- No **conflict resolution UI**; failed pet mutations surface errors after reconnect but there is no `conflicted` state yet.
- **Weights, vaccinations, medical records, and habits** require network; offline attempts fail or cannot be queued.
- **First offline pet create** needs pet types and categories to have been fetched while online.
- Cache-derived sessions may not reflect latest ban or email-verification state until reconnect.

Regression coverage includes `frontend/e2e/offline-mode.spec.ts` for pet create/edit/delete queue replay.

---

## Target behavior (roadmap)

These are engineering goals from the offline completion plan. **Do not document or ship UI as if they already exist.**

1. **Shared `queue-core`** extracted from the media upload queue; domain operation queue for durable non-media writes.
2. **Backend sync primitives** — idempotency keys, version/`If-Match` checks, structured `409 Conflict` inside the standard API envelope ([API Conventions](./api-conventions.md)).
3. **Local projections** — pure functions that merge server data with pending/failed/conflicted operations for consistent list/detail views.
4. **Expanded domains** — weights first end-to-end, then vaccinations, medical records, habits.
5. **Sync center** at `/settings/sync` — inspectable pending/failed/conflicted operations and upload queue with retry/discard actions.
6. **Conflict policy** — never silently overwrite server changes; user chooses keep mine / use server / discard where supported.

Until each item ships, keep UI and docs on the **Today** column of the matrix.

---

## UX rules

These apply to all offline-capable and online-required surfaces.

### 1. Online-only actions are disabled offline

When `useNetworkStatus()` is false:

- Do not call online-only APIs and pretend they succeeded.
- Disable or hide actions that require server authority (placement, messaging, invites, auth changes).
- Show concise messaging (`ConnectionLostState`, disabled buttons, or inline copy) instead of opaque errors.

Pet routes remain reachable with cached data; other routes may block entirely via `OfflineAwareRoute`.

### 2. Pending work must be visible

Users should always be able to tell that local changes have not reached the server yet.

- **Today:** `OfflineBadge` (offline vs syncing + unified pending count), reconnect syncing toasts, optimistic pet UI, `beforeunload` guard for pending uploads.
- **Target:** sync center with per-operation status, last successful sync time, and distinct failed/conflicted styling.

### 3. Failed and conflicted work must be actionable

- **Today:** Failed pet mutations surface errors after reconnect. Retryable upload failures stay queued for another attempt; permanent upload failures show an error and are removed. No conflict-merge UI.
- **Target:** Explicit retry, discard, and conflict resolution choices. Failed operations never disappear silently.

### 4. No silent overwrite

- **Today:** Optimistic pet updates roll back on hard failures; reconnect does not discard paused mutations.
- **Target:** Server wins only when the user chooses "use server" or when automatic merge rules are explicitly safe (for example, delete-already-deleted). Updates against a changed server base become `conflicted`, not hidden merges.

### 5. Do not block care on connectivity theater

Prefer queued writes with honest pending state over hard failure for supported pet workflows. Prefer read-only cached data over empty screens when safe.

---

## Security and cache boundaries

Keep these layers separate. Do not blur them without an explicit design review.

| Layer                          | Stores                                                            | Lifetime / scope                                                | Cleared on logout / user switch     |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| **Workbox (service worker)**   | App shell, hashed build assets, icons, fonts, public static media | Precache + build output under `/build/`; not authenticated JSON | No — public assets only             |
| **TanStack Query persistence** | Allowlisted authenticated API reads (pets, taxonomy, featured)    | IndexedDB `meo-query-cache`, 24h `maxAge`                       | Yes — `clearOfflineCache()`         |
| **Cached auth identity**       | Last known user snapshot for offline bootstrap                    | Versioned, 24h TTL                                              | Yes — `clearCachedAuthIdentity()`   |
| **Media upload queue**         | Private photo blobs and upload metadata                           | IndexedDB `meo-media-uploads`                                   | Yes — `clearMediaUploadQueue()`     |
| **Operation queue (target)**   | Durable domain write operations                                   | IndexedDB, not localStorage                                     | Yes — shared `clearOfflineQueues()` |

### Rules

- **Do not** add Workbox runtime caching for authenticated `/api` JSON unless there is a proven cleanup story on logout. Keep `/api`, `/auth`, `/sanctum`, `/admin`, and `/livewire` out of offline navigation fallbacks.
- **Do not** persist sensitive queries outside the explicit allowlist in `query-cache.ts`.
- **Do not** let queued private media or mutation state survive logout, account deletion, or switching to another user. Tests in `auth-cache-clear.test.tsx` guard the media-queue path.
- **Impersonation / user switch:** when `GET /users/me` disagrees with the persisted session, offline query data is cleared before rendering user-scoped screens ([Authentication](./authentication.md)).

---

## Engineering checklist

When adding or changing offline behavior:

1. Classify the feature in the matrix above (today vs target vs online-required).
2. If it writes data, decide whether it belongs in the media queue, mutation persistence, or the future operation queue — not ad hoc `localStorage`.
3. Use Orval-generated query keys and domain invalidation helpers; avoid handwritten cache keys.
4. Subscribe to `onlineManager` through `useNetworkStatus()` for UI and replay gating.
5. Update pending counts through `useUnifiedPendingCount()` or its successors so badge, toasts, and sync center stay aligned.
6. Add tests at the appropriate layer: unit mocks for queue/PWA logic, integration for reconnect replay, E2E only where browser persistence is essential (`frontend/e2e/offline-mode.spec.ts`).

---

## What we explicitly do not promise

- Offline placement, adoption, messaging, invitations, auth/account security, or admin workflows.
- Offline editing of weights, vaccinations, medical records, or habits until those domains ship on the operation queue.
- Infinite offline duration — 24-hour caps apply to persisted cache and cached identity.
- Multi-device conflict resolution beyond the conservative policies described in the target roadmap.
- Background sync when the app is fully closed (browser/OS dependent; rely on reconnect when the PWA is opened again).

When in doubt, prefer honest "requires internet" UX over speculative offline support.
