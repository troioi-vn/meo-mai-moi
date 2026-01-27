<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/users/me/password',
    summary: "Update authenticated user's password",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['current_password', 'new_password', 'new_password_confirmation'],
            properties: [
                new OA\Property(property: 'current_password', type: 'string', format: 'password', example: 'old_secret_password'),
                new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'new_secret_password'),
                new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'new_secret_password'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Password updated successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', type: 'null', nullable: true),
                    new OA\Property(property: 'message', type: 'string', example: 'Password updated successfully.'),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Validation Error'),
                    new OA\Property(property: 'errors', type: 'object', example: ['current_password' => ['The provided password does not match your current password.']]),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class UpdatePasswordController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(UpdatePasswordRequest $request)
    {
        $user = $request->user();

        $user->password = Hash::make($request->new_password);
        $user->save();

        return $this->sendSuccessWithMeta(null, 'Password updated successfully.');
    }
}
