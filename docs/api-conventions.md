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

### Automatic Unwrapping

The frontend uses an Axios interceptor (defined in `frontend/src/api/axios.ts`) that automatically unwraps the `data` key from the envelope.

**Calling an API:**

```typescript
// The interceptor returns response.data.data
const pet = await api.get<Pet>("/pets/1");

console.log(pet.name); // "Fluffy"
```

This means frontend components and hooks do not need to access `.data.data` manually.
