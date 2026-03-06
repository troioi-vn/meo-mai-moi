<?php

declare(strict_types=1);

namespace App\Http\Controllers\GptAuth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailConfigurationService;
use App\Services\GptConnectorService;
use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/gpt-auth/register',
    summary: 'Register user for GPT connector flow',
    description: 'Registers a new user without invitation code during a valid GPT OAuth session and logs the user into the web session.',
    tags: ['GPT Auth'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['session_id', 'session_sig', 'name', 'email', 'password', 'password_confirmation'],
            properties: [
                new OA\Property(property: 'session_id', type: 'string', format: 'uuid', example: '7e8e7807-778f-489f-9407-bf64af1c8fff'),
                new OA\Property(property: 'session_sig', type: 'string', example: 'f4a8d23236d5a0f8f8fcb86c7dbe34ad67d6c9f1a0f00114bca2fd249299f2d0'),
                new OA\Property(property: 'name', type: 'string', example: 'GPT User'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'gpt-user@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Password1secure'),
                new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: 'Password1secure'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'User registered and logged in',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(
                                property: 'user',
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer', example: 42),
                                    new OA\Property(property: 'name', type: 'string', example: 'GPT User'),
                                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'gpt-user@example.com'),
                                ]
                            ),
                            new OA\Property(property: 'requires_verification', type: 'boolean', example: true),
                            new OA\Property(property: 'email_verified', type: 'boolean', example: false),
                            new OA\Property(property: 'email_sent', type: 'boolean', example: true),
                            new OA\Property(property: 'message', type: 'string', example: "We've sent a verification email to gpt-user@example.com."),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 400,
            description: 'Invalid signature or replayed session',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Invalid session signature.'),
                ]
            )
        ),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]

class RegisterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        GptConnectorService $gptConnectorService,
        SettingsService $settingsService,
        EmailConfigurationService $emailConfigurationService
    )
    {
        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'session_sig' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(10)->letters()->mixedCase()->numbers()->uncompromised(), 'confirmed'],
        ]);

        $sessionId = $validated['session_id'];
        $sessionSignature = $validated['session_sig'];

        if (! $gptConnectorService->isValidSessionSignature($sessionId, $sessionSignature)) {
            return $this->sendError('Invalid session signature.', 400);
        }

        if (! Cache::add("registration_attempted:{$sessionId}", 1, now()->addMinutes(10))) {
            return $this->sendError('Session has already been used for registration.', 400);
        }

        $emailVerificationRequired = $settingsService->isEmailVerificationRequired();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'registered_via_gpt' => true,
        ]);

        if (! $emailVerificationRequired) {
            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        [$emailSent, $message] = $this->prepareVerificationResponse(
            $user,
            $emailVerificationRequired,
            $emailConfigurationService
        );

        return $this->sendSuccess([
            'user' => $user,
            'requires_verification' => $emailVerificationRequired,
            'email_verified' => ! $emailVerificationRequired,
            'email_sent' => $emailSent,
            'message' => $message,
        ], 201);
    }

    private function prepareVerificationResponse(
        User $user,
        bool $emailVerificationRequired,
        EmailConfigurationService $emailConfigurationService
    ): array {
        if (! $emailVerificationRequired) {
            return [false, 'Registration completed successfully. You can now access your account.'];
        }

        if (! $emailConfigurationService->isEmailEnabled()) {
            return [false, 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.'];
        }

        try {
            $user->sendEmailVerificationNotification();

            return [true, 'We\'ve sent a verification email to '.$user->email.'. Please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.'];
        } catch (\Exception $e) {
            Log::warning('Email verification could not be sent during GPT registration', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return [false, 'We\'ve failed to send a verification email. But hopefully you will receive it soon.'];
        }
    }
}
