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

| Feature                                    | Today                                                                                                                                      | Target                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Pet list / profile view                    | Read from persisted TanStack Query cache when previously fetched                                                                           | Same; keep cache allowlist explicit                                       |
| Pet create / edit / delete / status change | Queued via durable operation store with optimistic cache projections; replays on reconnect                                                 | Same; keep idempotency keys and conflict handling aligned with backend    |
| Pet photos                                 | Durable IndexedDB upload queue with retry/backoff; pending photos promote after offline pet create syncs                                   | Same queue on shared `queue-core`; clearer failed-state UX in sync center |
| Weights                                    | Offline create/update/delete queue via operation store; reconnect replay; pending rows in UI; failed/conflicted ops in sync-issues popover | Conflict merge UI; full sync center page                                  |
| Vaccinations                               | Offline create/update/delete queue via operation store; reconnect replay; pending rows in UI; failed/conflicted ops in sync-issues popover | Queue renew; file attachments via media queue                             |
| Medical records                            | Offline create/update/delete metadata queue via operation store; photo uploads queue via media queue; photo delete remains online-only     | Add richer file/photo conflict and recovery UX                            |
| Habits                                     | Offline day check-ins and habit edits queue via operation store; reconnect replay; pending markers in UI                                   | Merge/idempotent day semantics hardened in conflict UI                    |

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

- **Pet writes** (create, edit, delete, status change) enqueue durable operations in IndexedDB (`frontend/src/offline/operations/`) when offline. Pending creates use local placeholder IDs; list/detail views merge pending ops via projection helpers.
- **Optimistic pet cache updates** keep list/detail views coherent while operations are pending.
- **Weight create/update/delete** (`frontend/src/hooks/useWeights.ts`) enqueue durable operations in IndexedDB (`frontend/src/offline/operations/`) when offline. Pending creates appear in the weight list with negative placeholder IDs; pending updates merge onto cached server rows; pending deletes hide rows locally.
- **Weight reconnect replay** (`frontend/src/offline/sync/`) replays pending weight creates, updates, then deletes, sends `Idempotency-Key` headers where supported, invalidates the pet weights query on success, treats delete `404` as already-successful, and classifies errors as retryable (`pending`), failed (validation/permanent), or conflicted (`409` on update).
- **Vaccination create/update/delete** (`frontend/src/hooks/useVaccinations.ts`) enqueue durable operations in IndexedDB when offline. Pending creates appear in active/all lists with local placeholder IDs; pending updates merge onto cached server rows; pending deletes hide rows locally.
- **Vaccination renew and photo upload/delete** are intentionally online-only: `useVaccinations` rejects those actions when offline before calling the API; callers surface existing error toasts.
- **Vaccination reconnect replay** (`frontend/src/offline/sync/`) replays pending vaccination creates, updates, then deletes, sends `Idempotency-Key` headers where supported, invalidates the pet vaccinations query on success, treats delete `404` as already-successful, and classifies errors as retryable (`pending`), failed (validation/permanent), or conflicted (`409` on update).
- **Medical record create/update/delete** (`frontend/src/hooks/useMedicalRecords.ts`) enqueues durable operations in IndexedDB when offline. Pending creates appear in the list with local placeholder IDs; pending updates merge onto cached server rows; pending deletes hide rows locally.
- **Medical record photo upload** queues through the media upload queue when offline. Photos for pending local records promote after the record create replay returns a real server ID. Photo delete remains online-only.
- **Medical record reconnect replay** (`frontend/src/offline/sync/`) replays pending medical-record creates, updates, then deletes, sends `Idempotency-Key` headers where supported, invalidates the pet medical-records query on success, promotes queued photos after successful creates, and classifies errors as retryable (`pending`), failed (validation/permanent), or conflicted.
- **Habit day check-ins and edits** (`frontend/src/pages/habits/`, `frontend/src/components/habits/HabitDayDialog.tsx`) enqueue durable operations when offline. Heatmaps and day dialogs merge pending entries via projection helpers; reconnect replay uses idempotent day-level semantics.
- **Habit reconnect replay** (`frontend/src/offline/sync/`) replays pending habit operations, invalidates habit activity queries on success, and classifies errors as retryable (`pending`), failed, or conflicted.
- **Media upload queue** (`frontend/src/lib/media-upload-queue.ts`) durably stores photo uploads with `queued | uploading | error` states, exponential backoff, and online resubscription. Retryable failures stay queued for another attempt; permanent failures show an error and are removed.
- **Reconnect handling** (`use-sync-status.ts`) replays pending offline operations, processes the upload queue, shows syncing/complete toasts, promotes pending photos after offline pet create, and warns on `beforeunload` when uploads or operations are still pending.

### Pending visibility

- **`OfflineBadge`** uses `useUnifiedPendingCount()` to combine queued media uploads and pending/failed/conflicted offline operations.
- **`OfflineSyncIssues`** popover and **`/settings/sync`** sync center list failed and conflicted operations with retry (failed only) and discard actions. Retry re-queues the operation and triggers offline operation replay when online.
- **Online state** flows through TanStack `onlineManager` via `useNetworkStatus()` (not ad hoc `navigator.onLine` checks in feature code).

### PWA updates

- Service worker updates are **prompt-based** (`registerType: 'prompt'`), not surprise reloads on detection alone.
- Focus regain and hourly checks may discover a new worker, but the app reloads only after `AppUpdateProvider` confirms no dirty forms or blocking dialogs remain — unless `VITE_FORCE_RELOAD_ON_UPDATE=true`, which reloads immediately.
- Installed PWAs cold-start from precached `/build/index.html` (paired with `site.webmanifest` `start_url`).

### Privacy cleanup

On logout, account deletion, or authenticated user switch, `clearAuthenticatedAppState` clears all private offline stores via `clearAuthenticatedOfflineData`:

- TanStack Query memory cache and persisted query store (`meo-query-cache`)
- Cached auth identity
- Media upload queue (including blob previews)
- Offline operation queue (`meo-offline-operations`)

TanStack Query **mutations are not persisted**; durable writes live only in the operation and media queues.

### Known limits today

- **Sync center** at `/settings/sync` covers failed/conflicted operations and errored uploads; pending/active rows are listed but retry is limited to failed items.
- **Conflict resolution UI** supports discard and, for supported domains, keep-mine / use-server actions in the sync center — not every domain has merge UI yet.
- **Weights:** create/update/delete offline; update conflicts surface as `conflicted` in the sync UI.
- **Vaccinations:** create/update/delete offline; renew and photos still require network.
- **Medical records:** create/update/delete metadata and photo upload work offline; photo delete still requires network.
- **Habits:** day check-ins and edits offline; complex multi-device merge remains conservative.
- **First offline pet create** needs pet types and categories to have been fetched while online.
- Cache-derived sessions may not reflect latest ban or email-verification state until reconnect.
- Workbox may cache public `/storage/` images and build assets across users; private queued blobs and authenticated query/operation data are cleared on logout/user switch.

Regression coverage includes:

- **Integration:** `frontend/src/offline/offline-mode.integration.test.tsx` — persisted cache restore, cross-domain reconnect replay (pets, medical records, habits), real IndexedDB cleanup on reconnect `401`, anonymous offline landing, and shared logout cleanup.
- **E2E:** `frontend/e2e/offline-mode.spec.ts` — cold-start cached auth, offline pet create/edit/delete queue replay, offline medical record create, and offline habit day check-in with reconnect persistence.
- **Unit / focused:** `frontend/src/lib/private-data-cleanup.test.ts`, `frontend/src/hooks/use-auth-bootstrap.test.tsx`, PWA boundary tests in `frontend/src/pwa.test.ts`, weight/habit/medical replay tests, operation store, unified pending count, and sync UI.

---

## Target behavior (roadmap)

These are engineering goals from the offline completion plan. **Do not document or ship UI as if they already exist.**

1. **Shared `queue-core`** extracted from the media upload queue — **done** for media; domain operation queue **done for pets, weights, vaccinations (create/update/delete), medical records (create/update/delete), and habits (day check-ins/edits)**.
2. **Backend sync primitives** — idempotency keys **done for weight and vaccination create/update/delete, plus medical-record create/update/delete**; version/`If-Match` checks and structured `409 Conflict` merge responses remain roadmap for broader conflict handling ([API Conventions](./api-conventions.md)).
3. **Local projections** — pet, weight, vaccination, medical-record, and habit views merge pending operations into cached data.
4. **Expanded domains** — pets, weights, vaccination create/update/delete, medical-record create/update/delete/photo upload, and habit day check-ins/edits **shipped**; vaccination renew/photo workflows and medical-record photo delete remain online-only.
5. **Sync center** at `/settings/sync` — **shipped** for failed/conflicted operations and errored uploads; richer pending/active controls remain roadmap.
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

- **Today:** `OfflineBadge` (offline vs syncing + unified pending count), reconnect syncing toasts, optimistic pet UI, sync-issues popover and `/settings/sync` for failed/conflicted operations, `beforeunload` guard for pending uploads and operations.
- **Target:** sync center with per-operation status, last successful sync time, and distinct failed/conflicted styling for all domains.

### 3. Failed and conflicted work must be actionable

- **Today:** Failed operations appear in the sync-issues popover and sync center with retry (failed) or discard (failed/conflicted). Supported conflict domains expose keep-mine / use-server in the sync center. Retryable upload failures stay queued for another attempt; permanent upload failures show an error and are removed.
- **Target:** Explicit retry, discard, and conflict resolution choices for all domains. Failed operations never disappear silently.

### 4. No silent overwrite

- **Today:** Optimistic pet projections roll back when replay fails; reconnect does not discard pending operations silently.
- **Target:** Server wins only when the user chooses "use server" or when automatic merge rules are explicitly safe (for example, delete-already-deleted). Updates against a changed server base become `conflicted`, not hidden merges.

### 5. Do not block care on connectivity theater

Prefer queued writes with honest pending state over hard failure for supported pet workflows. Prefer read-only cached data over empty screens when safe.

---

## Security and cache boundaries

Keep these layers separate. Do not blur them without an explicit design review.

| Layer                          | Stores                                                                  | Lifetime / scope                                                | Cleared on logout / user switch   |
| ------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| **Workbox (service worker)**   | App shell, hashed build assets, icons, fonts, public `/storage/` images | Precache + runtime caches; not authenticated JSON               | No — public assets only           |
| **TanStack Query persistence** | Allowlisted authenticated API reads (pets, taxonomy, featured)          | IndexedDB `meo-query-cache`, 24h `maxAge`; mutations not stored | Yes — `clearOfflineCache()`       |
| **Cached auth identity**       | Last known user snapshot for offline bootstrap                          | Versioned, 24h TTL                                              | Yes — `clearCachedAuthIdentity()` |
| **Media upload queue**         | Private photo blobs and upload metadata                                 | IndexedDB `meo-media-uploads`                                   | Yes — `clearMediaUploadQueue()`   |
| **Operation queue**            | Durable domain write operations                                         | IndexedDB `meo-offline-operations`, not localStorage            | Yes — `clearOperations()`         |

Private cleanup is centralized in `frontend/src/lib/authenticated-offline-cleanup.ts`.

### Rules

- **Do not** add Workbox runtime caching for authenticated `/api` JSON unless there is a proven cleanup story on logout. Keep `/api`, `/auth`, `/sanctum`, `/admin`, and `/livewire` out of offline navigation fallbacks.
- **Do not** persist sensitive queries outside the explicit allowlist in `query-cache.ts`.
- **Do not** let queued private media, operation state, or allowlisted query cache survive logout, account deletion, or switching to another user. Tests in `auth-cache-clear.test.tsx` and `private-data-cleanup.test.ts` guard cleanup paths.
- **Impersonation / user switch:** when `GET /users/me` disagrees with the persisted session, offline query data is cleared before rendering user-scoped screens ([Authentication](./authentication.md)).

---

## Engineering checklist

When adding or changing offline behavior:

1. Classify the feature in the matrix above (today vs target vs online-required).
2. If it writes data, decide whether it belongs in the media queue, mutation persistence, or the future operation queue — not ad hoc `localStorage`.
3. Use Orval-generated query keys and domain invalidation helpers; avoid handwritten cache keys.
4. Subscribe to `onlineManager` through `useNetworkStatus()` for UI and replay gating.
5. Update pending counts through `useUnifiedPendingCount()` or its successors so badge, toasts, and sync center stay aligned.
6. Add tests at the appropriate layer: unit mocks for queue/PWA logic, integration in `frontend/src/offline/offline-mode.integration.test.tsx` for reconnect replay and real IndexedDB cleanup, E2E in `frontend/e2e/offline-mode.spec.ts` where browser persistence is essential.

---

## What we explicitly do not promise

- Offline placement, adoption, messaging, invitations, auth/account security, or admin workflows.
- Offline vaccination renew/photo workflows or medical-record photo-delete workflows beyond what is listed in the matrix above.
- Full conflict merge UI for every offline-capable domain; unsupported conflicts may still be discard-only.
- Infinite offline duration — 24-hour caps apply to persisted cache and cached identity.
- Multi-device conflict resolution beyond the conservative policies described in the target roadmap.
- Background sync when the app is fully closed (browser/OS dependent; rely on reconnect when the PWA is opened again).

When in doubt, prefer honest "requires internet" UX over speculative offline support.
