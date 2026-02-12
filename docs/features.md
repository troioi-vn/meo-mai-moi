# Features

A detailed overview of Meo Mai Moi's capabilities.

## Pet Care Management

- **Pet Profiles**: Comprehensive profiles with photos, species/breed information, sex, and personality traits
- **Health Tracking**: Medical records, vaccination schedules, and appointment reminders
- **Weight Monitoring**: Regular weight tracking with visual charts and health insights
- **Care Scheduling**: Feeding schedules, medication reminders, and routine care tasks
- **Veterinary Integration**: Vet contact management and appointment history
- **Multi-Pet Support**: Manage multiple pets with individual profiles and care plans
- **Microchip Registry**: Track microchip information for identification

## Pet Rehoming & Adoption

- **Placement Requests**: Owners can create requests for permanent adoption, foster care (paid/free), or pet sitting
- **Helper Responses**: Community helpers can respond to placement requests with messages and profile information
- **Handover Management**: Physical handover confirmation for foster/permanent placements with relationship tracking
- **Relationship System**: Automatic creation and management of ownership, foster, and sitter relationships
- **Relationship Invitations**: Invite people as co-owners, editors, or viewers via shareable link or QR code with 1-hour expiry, accept/decline flow, and automatic role upgrades
- **Access Management**: Owners can remove editors/viewers; any participant can leave voluntarily (except the last owner)
- **Public Profiles**: Lost pets and pets with active placement requests are publicly viewable for wider reach
- **Chat Integration**: Built-in messaging between owners and helpers throughout the placement process, including:
  - **Image Sharing**: Send photos and screenshots directly in the chat
  - **Message Deletion**: Remove sent messages for all participants
  - **Batch Notifications**: 15-minute email digests for unread messages to avoid inbox clutter

## Notifications

- **In-App Notifications**: Real-time notification center with unread counts
- **Email Notifications**: Configurable email delivery for important events
- **Vaccination Reminders**: Daily checks for upcoming vaccinations with automated reminders
- **Cross-Tab Sync**: Read status syncs across browser tabs via real-time events
- **Actionable Notifications**: Click notifications to navigate directly to relevant content

## Admin Panel

Built with [Filament](https://filamentphp.com/):

- Pet profile management with health record oversight
- Weight tracking analytics and health trend monitoring
- Vaccination reminder system with email notifications
- User account management and verification
- User ban/unban with read-only mode for banned users
- User impersonation for support
- Care schedule templates and customization
- Health alert configuration and monitoring
- RBAC via Spatie Permission + Filament Shield
- Placement request oversight and relationship management
- Email configuration (database-driven, overrides .env)
- Notification template management

## Technical Features

- **API Documentation**: OpenAPI/Swagger spec auto-generated from controller annotations
- **Type-Safe Frontend**: API client generated via Orval with full TypeScript types
- **Real-Time Events**: Laravel Echo + Reverb for live updates
- **Email Delivery Tracking**: Track email delivery status
- **E2E Testing**: Playwright tests with real email verification via MailHog
- **Parallel Testing**: Backend tests run in parallel for faster feedback
- **Architecture Enforcement**: Deptrac validates layer dependencies
- **Auto Update Detection**: Dual mechanism — `X-App-Version` response header detects backend deploys on every API call; PWA service worker detects frontend asset changes. Both prompt the user to reload with a snoozeable toast
