# Bell Notifications — Tasklist

## Goals
- Unread count on bell icon
- Dropdown shows notifications; mark as read when opened
- Toast on newly arrived notifications (sonner)
- Templates: info, success, warning, error
- No dedicated page for now

## Backend (Laravel)
- [x] Ensure notifications table exists
  - [x] Migration present: `database/migrations/2025_07_13_145900_create_notifications_table.php`
- [x] Make sure `User` uses `Notifiable`
- [x] Add API endpoints (auth:sanctum)
  - [x] GET `/api/notifications?status=unread|all&page=1` → `{ data: Notification[] }`
  - [x] POST `/api/notifications/mark-all-read` → 204 (kept legacy alias `/notifications/mark-as-read`)
  - [x] PATCH `/api/notifications/{id}/read` → 204
- [x] Controller: `NotificationController@index|markAllRead|markRead` (maps DB shape → frontend contract)
- [x] Policy/guards: Scoped to `Auth::id()`; per-item read guarded
- [~] OpenAPI: `@OA` annotations added; [ ] run `php artisan l5-swagger:generate` and commit JSON

### Notification payload shape
- `id: string`
- `level: 'info' | 'success' | 'warning' | 'error'`
- `title: string`
- `body?: string`
- `url?: string`
- `created_at: ISO string`
- `read_at: ISO string | null`

## Frontend (React + TS)
- [x] Types: `src/types/notification.ts`
- [x] API helpers: `src/api/notifications.ts`
  - [x] `getNotifications({ status, page })`
  - [x] `markAllRead()`
  - [x] `markRead(id)`
- [x] Provider: `src/contexts/NotificationProvider.tsx`
  - [x] State: `notifications[]`, `unreadCount`, `loading`
  - [x] Poll every 30s (pause on hidden tab)
  - [x] De-dup by id; keep a `seenIds` set
  - [x] Toast new unread notifications (map level→variant/icon)
  - [x] Mark-all-read when dropdown opens (optimistic update)
  - [x] Exported context; bell handles missing provider in tests
- [x] UI: Update `NotificationBell` to a dropdown
  - [x] Badge with unread count
  - [x] DropdownMenu with list (icon, title, time-ago, optional body)
  - [x] Click item → navigate to `url` (if provided) and mark read
  - [x] Empty state when none
- [x] Utilities: tiny `timeAgo` helper inline in bell

## Testing (Vitest + RTL + MSW)
- [x] Handlers added inline in `src/mocks/handlers.ts`
  - [x] GET `http://localhost:3000/api/notifications`
  - [x] POST `http://localhost:3000/api/notifications/mark-all-read`
  - [x] PATCH `http://localhost:3000/api/notifications/:id/read`
  - [x] Response shape `{ data: ... }`
- [x] `sonner` mock already present in `setupTests.ts`
- [ ] Add focused UI tests for dropdown read-on-open and toast-on-new

## Edge cases & rules
- De-dup during polling; no toast spam for already-seen items
- Cap dropdown to latest ~20 items for now
- Axios baseURL is `/api` (use relative paths in code, absolute in MSW)
- Responses wrapped in `{ data: ... }`

## Future (not now)
- WebSockets (Laravel Echo) instead of polling
- Preferences and mute levels
- Pagination and full notifications page
- Rich toast actions (Undo, View)
