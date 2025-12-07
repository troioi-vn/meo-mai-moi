# Helper Profiles

Helper profiles allow users to register as helpers who can respond to placement requests for pets. A user can have one or more helper profiles.

## Fields

| Field        | Type      | Required | Description                                                                                                                                                                                              |
| ------------ | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| country      | string(2) | Yes      | ISO 3166-1 alpha-2 country code                                                                                                                                                                          |
| state        | string    | No       | State/Province                                                                                                                                                                                           |
| city         | string    | No       | City                                                                                                                                                                                                     |
| address      | string    | No       | Street address                                                                                                                                                                                           |
| zip_code     | string    | No       | ZIP/Postal code                                                                                                                                                                                          |
| phone_number | string    | Yes      | Contact phone number                                                                                                                                                                                     |
| contact_info | text      | No       | Additional contact information (e.g., Telegram, Zalo, WhatsApp, preferred contact times). This info and the phone number are visible to pet owners when the helper responds to their placement requests. |
| experience   | text      | Yes      | Description of the helper's experience with pets                                                                                                                                                         |
| has_pets     | boolean   | Yes      | Whether the helper currently has pets                                                                                                                                                                    |
| has_children | boolean   | Yes      | Whether the helper has children                                                                                                                                                                          |
| can_foster   | boolean   | Yes      | Whether the helper is available for fostering                                                                                                                                                            |
| can_adopt    | boolean   | Yes      | Whether the helper is available for adoption                                                                                                                                                             |
| is_public    | boolean   | Yes      | Whether the profile is visible in public listings                                                                                                                                                        |

## Visibility

- **Public profiles** (`is_public = true`) are visible to all authenticated users browsing helper listings.
- **Private profiles** (`is_public = false`) are only visible to the owner.
- When a helper responds to a placement request, the pet owner can view the helper's **phone number** and **contact info** to facilitate communication.

## API Endpoints

### List public helper profiles

```
GET /api/helper-profiles
```

### Get a specific helper profile

```
GET /api/helper-profiles/{id}
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
6. Upon acceptance, the handover process begins (see [Rehoming Flow](./rehoming-flow.md)).
