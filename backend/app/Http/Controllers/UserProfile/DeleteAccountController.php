<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteAccountRequest;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/users/me',
    summary: "Delete authenticated user's account",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['password'],
            properties: [
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'your_current_password'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Account deleted successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', type: 'string', nullable: true, example: null),
                    new OA\Property(property: 'message', type: 'string', example: 'Account deleted successfully.'),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Validation Error'),
                    new OA\Property(property: 'errors', type: 'object', example: ['password' => ['The provided password does not match your current password.']]),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class DeleteAccountController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(DeleteAccountRequest $request)
    {
        $user = $request->user();
        $user->tokens()->delete(); // Revoke all tokens for the user
        $user->delete();

        return $this->sendSuccessWithMeta(null, 'Account deleted successfully.');
    }
}
