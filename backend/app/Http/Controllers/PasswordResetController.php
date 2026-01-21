<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

/**
 * Password Reset Token Validation Controller
 *
 * This controller provides a token validation endpoint for the frontend.
 * The actual password reset functionality is handled by Laravel Fortify.
 */
class PasswordResetController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('guest');
        $this->middleware('throttle:6,1');
    }

    #[OA\Get(
        path: '/api/password/reset/{token}',
        summary: 'Validate password reset token',
        description: 'Check if password reset token is valid.',
        tags: ['Password Reset'],
        parameters: [
            new OA\Parameter(
                name: 'token',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string'),
                description: 'Reset token'
            ),
            new OA\Parameter(
                name: 'email',
                in: 'query',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'email'),
                description: 'User email'
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Token is valid',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'valid', type: 'boolean', example: true),
                        new OA\Property(property: 'email', type: 'string', example: 'user@example.com'),
                    ]
                )
            ),
            new OA\Response(
                response: 422,
                description: 'Invalid token'
            ),
        ]
    )]
    public function validateToken(Request $request, string $token)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'Invalid reset token.',
                'valid' => false,
            ], 422);
        }

        // Get the stored token record
        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('created_at', '>', now()->subHours(1)) // Token expires after 1 hour
            ->first();

        if (! $tokenRecord) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
                'valid' => false,
            ], 422);
        }

        // Check if the provided token matches the hashed token in database
        if (! Hash::check($token, $tokenRecord->token)) {
            return response()->json([
                'message' => 'Invalid reset token.',
                'valid' => false,
            ], 422);
        }

        return $this->sendSuccess([
            'valid' => true,
            'email' => $request->email,
        ]);
    }
}
