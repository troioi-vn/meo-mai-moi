<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesErrors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: "/api/pets/{id}",
    summary: "Delete a pet",
    tags: ["Pets"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(
            name: "id",
            in: "path",
            required: true,
            description: "ID of the pet to delete",
            schema: new OA\Schema(type: "integer")
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["password"],
            properties: [
                new OA\Property(property: "password", type: "string", format: "password", description: "User's current password for confirmation"),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 204,
            description: "Pet deleted successfully"
        ),
        new OA\Response(
            response: 403,
            description: "Forbidden"
        ),
        new OA\Response(
            response: 422,
            description: "Validation error"
        ),
    ]
)]
class DeletePetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesErrors;

    public function __invoke(Request $request, Pet $pet)
    {
        $user = $this->authorizeUser($request, 'delete', $pet);

        if (! Hash::check($request->input('password'), $user->password)) {
            return $this->handleBusinessError('The provided password does not match our records.', 422);
        }
        // Soft delete via status mutation (handled by overridden delete())
        $pet->delete();

        return response()->noContent();
    }
}