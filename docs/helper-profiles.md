# Helper Profiles

Helper profiles allow users to register as helpers who can respond to placement requests for pets. A user can have one or more helper profiles.

## Fields

| Field         | Type      | Required | Description                                                                                                                                                                                              |
| ------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| country       | string(2) | Yes      | ISO 3166-1 alpha-2 country code                                                                                                                                                                          |
| state         | string    | No       | State/Province                                                                                                                                                                                           |
| city_id       | bigint    | Yes      | Reference to the country-scoped City catalog (autocomplete by country; no create in this flow)                                                                                                           |
| city          | string    | No       | Derived display name of the selected city                                                                                                                                                                |
| address       | string    | No       | Street address                                                                                                                                                                                           |
| zip_code      | string    | No       | ZIP/Postal code                                                                                                                                                                                          |
| phone_number  | string    | Yes      | Contact phone number                                                                                                                                                                                     |
| contact_info  | text      | No       | Additional contact information (e.g., Telegram, Zalo, WhatsApp, preferred contact times). This info and the phone number are visible to pet owners when the helper responds to their placement requests. |
| experience    | text      | Yes      | Description of the helper's experience with pets                                                                                                                                                         |
| has_pets      | boolean   | Yes      | Whether the helper currently has pets                                                                                                                                                                    |
| has_children  | boolean   | Yes      | Whether the helper has children                                                                                                                                                                          |
| request_types | string[]  | Yes      | Types of placement requests this helper can respond to. Must contain at least one of: `foster_paid`, `foster_free`, `permanent`, or `pet_sitting`.                                                     |
| status        | string    | No       | `private` by default. Set to `public` to show the profile on the public helper directory. `archived` and `deleted` are internal lifecycle states.                                                       |

## Visibility

- **Private vs public**: Helper profiles can be `private` or `public`. Both states are active and can be used for placement-request responses. `public` profiles also appear on the public helper directory.
- **Owner visibility**: A user can always view their own helper profiles, regardless of approval status.
- **Placement request visibility**: A pet owner can view a helper's profile if that helper has responded (via a placement response) to one of their placement requests for that pet.
- **Public directory visibility**: Only helper profiles with `status = public` and `approval_status = approved` appear on the public `/helpers` listing and detail pages.
- **Admin visibility**: Admin users can view all helper profiles.
- When a helper responds to a placement request, the pet owner can view the helper's **phone number** and **contact info** to facilitate communication.

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

### Delete a helper profile

```
DELETE /api/helper-profiles/{id}
```

## Placement Request Flow

1. Pet owner creates a placement request for their pet.
2. Helpers with matching pet type preferences can respond to the request.
3. When responding, the helper selects one of their helper profiles.
4. The pet owner can view the helper's profile details, including phone number and contact info.
5. The owner can accept or reject the response.
6. Upon acceptance, the handover process begins (see [Placement Request Lifecycle](./placement-request-lifecycle.md)).
