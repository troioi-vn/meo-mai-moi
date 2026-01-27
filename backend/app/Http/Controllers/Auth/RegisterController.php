<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Controller;
use App\Http\Responses\Auth\RegisterResponse;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/register',
    summary: 'Register a new user',
    description: 'Registers a new user and returns an authentication token. May require invitation code when invite-only mode is active.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        required: true,
        description: 'User registration details',
        content: new OA\JsonContent(
            required: ['name', 'email', 'password', 'password_confirmation'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'John Doe'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'john.doe@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'password123'),
                new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: 'password123'),
                new OA\Property(property: 'invitation_code', type: 'string', nullable: true, example: 'abc123def456', description: 'Required when invite-only mode is active'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'User registered successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(
                                property: 'user',
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer', example: 123),
                                    new OA\Property(property: 'name', type: 'string', example: 'John Doe'),
                                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'john.doe@example.com'),
                                    new OA\Property(property: 'email_verified_at', type: 'string', nullable: true, example: '2026-01-27T12:34:56.000000Z'),
                                ]
                            ),
                            new OA\Property(property: 'email_verified', type: 'boolean', example: false),
                            new OA\Property(property: 'email_sent', type: 'boolean', example: true),
                            new OA\Property(property: 'requires_verification', type: 'boolean', example: true),
                            new OA\Property(property: 'message', type: 'string', example: "We've sent a verification email to john.doe@example.com. Please check your inbox and click the link to verify your email address."),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
        new OA\Response(
            response: 403,
            description: 'Registration not allowed (invite-only mode active without valid invitation)'
        ),
    ]
)]
class RegisterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $createNewUser = app(CreateNewUser::class);
        $registerResponse = app(RegisterResponse::class);

        // Create user using Fortify action (includes all business logic)
        $user = $createNewUser->create($request->all());

        // Log in the user for session-based authentication
        if ($request->hasSession() && ! app()->runningInConsole() && ! app()->runningUnitTests() && $user->hasVerifiedEmail()) {
            try {
                Auth::login($user);
                $request->session()->regenerate();
            } catch (\Exception $e) {
                // Session login is optional in API context - continue silently
                // Log for debugging but don't fail registration
                Log::debug('Session login failed during registration', ['error' => $e->getMessage()]);
            }
        }

        // Set the user in the request for the response class
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        // Return response using Fortify response class
        return $registerResponse->toResponse($request);
    }
}
