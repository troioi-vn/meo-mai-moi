# Features

What the app does today. For a running instance, see the [project site](https://project.meo-mai-moi.com/).

## Pets and health

A pet profile holds photos, type and breed, sex, birthday, and personality notes. Around that:

- Medical records and vet visit history
- Vaccination records, with a daily job that emails a reminder before a dose is due
- Weight history charted over time, for pets and for their owners
- Microchip numbers and registry details
- Birthday reminders
- Lost and deceased states, which change who can see the profile

See [Pet profiles](./pet-profiles.md) for the field-level detail.

## Habits

Habits are repeating care routines such as playtime or grooming. Each one gets a day grid holding up to two years of check-ins. The grid adapts to the available width and refuses future dates. A daily job sends reminders for habits that are due. Pets marked lost or deceased leave active tracking, but their past entries stay readable.

## Rehoming and adoption

An owner opens a placement request for permanent adoption, foster care (paid or free), or pet sitting. Helpers respond with a message and their profile. If the owner accepts, a handover step confirms the physical transfer and opens the matching relationship. Temporary placements are closed by the owner when the pet comes back.

Pets that are lost or have an open placement request become publicly viewable, so the listing reaches people without accounts.

Owners and helpers get a chat thread for the duration. It carries images, lets either side delete a message for everyone, and batches unread-message emails into 15-minute digests instead of one mail per line.

The full state machine is in [Placement request lifecycle](./placement-request-lifecycle.md).

## Shared access

A pet can have several people attached at once, each as owner, foster, sitter, editor, or viewer, and each with its own start and end date. Access is granted by shareable link or QR code with a one-hour expiry and an accept or decline step.

Owners can change or remove anyone's role, including a co-owner, as long as one active owner remains. Anyone else can leave on their own. See [Pet relationship system](./pet-relationship-system.md) and [Invites](./invites.md).

## Groups

Rescues and shelters that manage pets together use groups. A group owns pets collectively, holds its own membership list with roles, and can feed its pet list into a shared ledger. See [Groups](./groups.md).

## Shared expenses

A ledger tracks money for a set of pets. Transactions carry an amount, date, category, account, description, and optional links to specific pets or health records. Amounts are stored as integer minor units, and each ledger has one currency. The ledger itself is the authorization boundary, so membership in a ledger is what grants access to its transactions. See [Finance](./finance.md).

## Notifications

Every notification type can be switched on or off per channel, independently. The channels are in-app, email, web push over VAPID, and Telegram.

- The in-app center shows unread counts and syncs read state across browser tabs
- Clicking a notification opens the thing it refers to
- Emails carry a signed unsubscribe link that opens a confirmation dialog for either all email or that one type
- Users link a Telegram account to receive the same events as bot messages

See [Notifications](./notifications.md).

## Telegram

Beyond notifications, the bot handles sign-in. A user can log in from the Telegram mini-app or hand off from the bot into a browser session, and can disconnect the link later from settings.

## Offline use

The app installs as a PWA. React Query keeps selected pet queries for up to 24 hours, so cached lists and detail pages still open after a reload with no connection. Pet create, edit, and delete actions go into a durable queue and replay on reconnect, reconciled with idempotency keys and version checks rather than last-write-wins.

The interface shows offline and syncing state, keeps optimistic updates visible, retries once after a CSRF token expires, and warns before you close a tab while an offline-created pet still has a photo waiting to upload. What this does and does not promise is written down in [Offline mode](./offline-mode.md).

## AI assistant access

Two OAuth consent bridges let external assistants reach the API, one for MCP clients and one for GPT connectors. Both issue scoped tokens that run through the same policies as a browser session, so an assistant cannot see or change anything its user could not.

## Storage limits

Default accounts get 50 MB, premium accounts get 5 GB, and both numbers are editable in admin system settings. Settings shows current usage against the limit with a progress bar. Once an account is full, image uploads are blocked and non-premium users see an upgrade prompt.

## Admin panel

Built with [Filament](https://filamentphp.com/):

- Pet profiles and their health records
- Weight history and vaccination reminder oversight
- User accounts, verification, ban and unban with a read-only mode for banned users
- Impersonation for support
- Per-user storage usage against limit
- Roles and permissions through Spatie Permission and Filament Shield
- Placement requests and relationships
- Email configuration stored in the database, which overrides `.env`
- Notification templates
- System settings, including the storage limit per role

See [Admin](./admin.md) and [Roles](./roles.md).

## Under the hood

- The OpenAPI spec is generated from controller annotations, and Orval turns it into a typed frontend client
- Laravel Echo and Reverb carry live updates
- Email delivery status is logged per message
- Playwright drives the E2E suite, including real email verification through MailHog
- Backend tests run in parallel
- Deptrac enforces the `Http -> Services -> Domain` layer order
- Two independent update checks: the `X-App-Version` response header catches a backend deploy on any API call, and the service worker catches changed frontend assets. Both raise a snoozeable toast rather than reloading under you, and fall back to a plain page reload if the service worker handoff stalls
