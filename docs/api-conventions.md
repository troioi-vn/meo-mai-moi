# API Conventions

This document outlines the conventions used for API development in Meo Mai Moi, ensuring consistency across the backend, documentation, and frontend.

## Response Envelope

All API responses follow a standard JSON envelope format. This consistency allows the frontend to have a single entry point for handling data, messages, and errors.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Fluffy"
  },
  "message": "Pet retrieved successfully"
}
```

- `success` (boolean): Always `true`.
- `data` (object|array): The primary payload of the response.
- `message` (string): A short, human-readable description of the result.

### Error Response

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "name": ["The name field is required."]
  }
}
```

- `success` (boolean): Always `false`.
- `message` (string): A human-readable description of the error.
- `errors` (object): Optional. Field-specific validation errors.

## Backend Implementation

### `ApiResponseTrait`

Controllers should use the `App\Traits\ApiResponseTrait` to generate responses.

- `sendSuccess($data, $message, $code)`: Standard success response.
- `sendError($message, $code, $errors)`: Standard error response.
- `sendSuccessWithMeta($message, $data, $code)`: Success response where the message is also nested in data (useful for frontend interceptors).

### OpenAPI (Swagger) Documentation

All endpoints must be annotated with OpenAPI attributes. Use the centralized schemas in `app/Schemas/ResponseSchemas.php` to define the response structure:

```php
#[OA\Response(
    response: 200,
    description: 'Success',
    content: new OA\JsonContent(ref: '#/components/schemas/PetResponse')
)]
```

## Frontend Consumption

### Typesafe API Client (Orval)

We use [Orval](https://orval.dev/) to generate a fully typesafe API client and React Query hooks from our backend's OpenAPI `api-docs.json`. This eliminates manual wiring of query keys, response types, and invalidations.

**Workflow:**

1. Update backend OpenAPI annotations.
2. Run `bun run api:generate` in the `frontend` directory.
3. Import the generated hooks from `@/api/generated/`.

**Example:**

```typescript
import { useGetPets } from "@/api/generated/pets/pets";

const { data: pets } = useGetPets(); // pets is automatically typed as Pet[]
```

The generated client is configured via `frontend/src/api/orval-mutator.ts`. It uses our centralized Axios instance and automatically accounts for the data envelope unwrapping at both the runtime (via interceptors) and type level (via Orval transformers).

### Automatic Unwrapping

We use two mechanisms to simplify data access:

1.  **Axios Interceptor**: Defined in `frontend/src/api/axios.ts`, it automatically unwraps the `data` key from the backend's JSON envelope.
2.  **Orval Transformer**: Defined in `frontend/orval.config.ts`, it unwraps the `{ data: T }` type in the generated hooks, so callers receive the payload directly.

Both work together to ensure that `const { data } = useGetPets()` gives you the actual list of pets, not the `{ data: pets }` structure.
