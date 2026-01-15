<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: "/api/users/me",
    summary: "Update authenticated user's profile",
    tags: ["User Profile"],
    security: [["sanctum" => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name", "email"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john.doe@example.com")
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: "Successful operation",
            content: new OA\JsonContent(ref: "#/components/schemas/User")
        ),
        new OA\Response(
            response: 422,
            description: "Validation error",
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "message", type: "string", example: "Validation Error"),
                    new OA\Property(property: "errors", type: "object", example: ["name" => ["The name field is required."]])
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: "Unauthenticated"
        )
    ]
)]
class UpdateProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$request->user()->id,
        ]);

        $user = $request->user();
        $user->fill($validatedData);
        $user->save();

        return $this->sendSuccess($user);
    }
}
