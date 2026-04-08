# Helper Profiles

Helper profiles allow users to register as helpers who can respond to placement requests for pets. A user can have one or more helper profiles.

## Fields

| Field           | Type      | Required | Description                                                                                                                                                                                |
| --------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| country         | string(2) | Yes      | ISO 3166-1 alpha-2 country code                                                                                                                                                            |
| state           | string    | No       | State/Province                                                                                                                                                                             |
| city_id         | bigint    | Yes      | Reference to the country-scoped City catalog (autocomplete by country; no create in this flow)                                                                                             |
| city            | string    | No       | Derived display name of the selected city                                                                                                                                                  |
| address         | string    | No       | Street address                                                                                                                                                                             |
| zip_code        | string    | No       | ZIP/Postal code                                                                                                                                                                            |
| phone_number    | string    | Yes      | Contact phone number                                                                                                                                                                       |
| contact_details | json[]    | No       | Structured additional contact methods. Each item stores a `type` and normalized `value` (for example Telegram handle, Facebook username, WhatsApp number, or plain-text Zalo/Other entry). |
| experience      | text      | Yes      | Description of the helper's experience with pets                                                                                                                                           |
| has_pets        | boolean   | Yes      | Whether the helper currently has pets                                                                                                                                                      |
| has_children    | boolean   | Yes      | Whether the helper has children                                                                                                                                                            |
| request_types   | string[]  | Yes      | Types of placement requests this helper can respond to. Must contain at least one of: `foster_paid`, `foster_free`, `permanent`, or `pet_sitting`.                                         |
| status          | string    | No       | `private` by default. Set to `public` to show the profile on the public helper directory. `archived` and `deleted` are internal lifecycle states.                                          |

## Photos

- Helper profiles can include multiple photos.
- The first photo in the ordered photo collection is treated as the main photo and is returned with `is_primary = true`.
- Uploading new photos appends them to the gallery.
- Owners can delete photos and set any existing photo as the main photo.

## Visibility

- **Private vs public**: Helper profiles can be `private` or `public`. Both states are active and can be used for placement-request responses. `public` profiles also appear on the public helper directory.
- **Owner visibility**: A user can always view their own helper profiles, regardless of approval status.
- **Placement request visibility**: A pet owner can view a helper's profile if that helper has responded (via a placement response) to one of their placement requests for that pet.
- **Public directory visibility**: A helper profile is publicly visible only when `HelperProfile::isPubliclyVisible()` returns `true`, which currently means `status = public` and `approval_status = approved`. New helper profiles are approved by default, so a newly created public profile appears on the public `/helpers` listing immediately and can be opened on `/helpers/{id}` / `GET /api/helpers/{id}`.
- **Admin visibility**: Admin users can view all helper profiles.
- Public helper pages do **not** expose phone numbers or structured contact details.
- When a helper responds to a placement request, the pet owner can view the helper's **phone number** and **contact details** to facilitate communication.

## Admin Notifications

- Creating a helper profile through `POST /api/helper-profiles` sends an in-app notification to every user with the `super_admin` role.
- Updating a helper profile through `PUT /api/helper-profiles/{id}` or the compatibility `POST /api/helper-profiles/{id}` endpoint sends the same style of in-app notification to `super_admin` users.
- These alerts link directly to the Filament edit screen for the affected helper profile.
- This notification is API-only by design; creating or editing helper profiles from Filament does not emit the alert.

## E2E Coverage

Playwright coverage for helper profiles currently lives in `frontend/e2e/helper-profile-creation.spec.ts`.

- Creates a helper profile through the real browser flow
- Verifies approved public helper profiles appear on `/helpers`
- Verifies approved public helper profiles can be opened on `/helpers/:id`
- Verifies newly created public helper profiles appear on `/helpers` immediately
- Verifies newly created public helper profiles can be opened on `/helpers/:id` immediately
- Verifies profiles that are not publicly visible do not appear on `/helpers`
- Verifies direct public access to a non-public profile returns `404` from `GET /api/helpers/{id}`

## API Endpoints

### List helper profiles visible to the current user

```
GET /api/helper-profiles
```

### Get a specific helper profile visible to the current user

```
GET /api/helper-profiles/{id}
```

### List public helper profiles

```
GET /api/helpers
```

Supported query params:

- `country`
- `city`
- `request_type`
- `pet_type_id`
- `search`

### Get a public helper profile

```
GET /api/helpers/{id}
```

### Create a helper profile

```
POST /api/helper-profiles
```

### Update a helper profile

```
PUT /api/helper-profiles/{id}
POST /api/helper-profiles/{id}
```

### Delete a helper profile photo

```
DELETE /api/helper-profiles/{id}/photos/{photoId}
```

### Set the main helper profile photo

```
POST /api/helper-profiles/{id}/photos/{photoId}/set-primary
```

### Delete a helper profile

```
DELETE /api/helper-profiles/{id}
```

## Placement Request Flow

1. Pet owner creates a placement request for their pet.
2. Helpers with matching pet type preferences can respond to the request.
3. When responding, the helper selects one of their helper profiles.
4. The pet owner can view the helper's profile details, including phone number and structured contact details.
5. The owner can accept or reject the response.
6. Upon acceptance, the handover process begins (see [Placement Request Lifecycle](./placement-request-lifecycle.md)).
