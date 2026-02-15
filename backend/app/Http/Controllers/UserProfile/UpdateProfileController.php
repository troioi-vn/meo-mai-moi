<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/users/me',
    summary: "Update authenticated user's profile",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'email'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'John Doe'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'john.doe@example.com'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Successful operation',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Validation Error'),
                    new OA\Property(property: 'errors', type: 'object', example: ['name' => ['The name field is required.']]),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
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
        $emailChanged = strcasecmp((string) $user->email, (string) $validatedData['email']) !== 0;
        $previousEmail = $user->email;
        $previousEmailVerifiedAt = $user->email_verified_at;

        $user->fill($validatedData);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if (! $emailChanged) {
            return $this->sendSuccess($user);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $exception) {
            Log::warning('Sending verification email after profile email change failed', [
                'user_id' => $user->id,
                'old_email' => $previousEmail,
                'new_email' => $validatedData['email'],
                'error' => $exception->getMessage(),
            ]);

            $user->forceFill([
                'email' => $previousEmail,
                'email_verified_at' => $previousEmailVerifiedAt,
            ])->save();

            return $this->sendError(__('messages.email.verification_unavailable'), 503);
        }

        return $this->sendSuccessWithMeta([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'requires_email_verification' => true,
            'verification_email_sent' => true,
        ], __('messages.auth.verification_sent'));
    }
}
