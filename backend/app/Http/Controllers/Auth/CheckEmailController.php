<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/check-email',
    summary: 'Check if email exists',
    description: 'Check if an email address is registered in the system.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        required: true,
        description: 'Email to check',
        content: new OA\JsonContent(
            required: ['email'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Email check result',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'exists', type: 'boolean', example: true),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class CheckEmailController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        // Compute existence
        $exists = User::where('email', $request->email)->exists();

        // Audit log without leaking existence
        Log::info('Auth email pre-check', [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['data' => ['exists' => $exists]]);
    }
}
