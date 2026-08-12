<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramLoginHandshakeService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/auth/telegram/handshake/{nonce}',
    summary: 'Claim a browser-bound Telegram login handshake',
    description: 'Polls a handshake from its originating browser session. An approved handshake is consumed once and logs that browser session in.',
    tags: ['Authentication'],
    parameters: [
        new OA\Parameter(name: 'nonce', in: 'path', required: true, schema: new OA\Schema(type: 'string', minLength: 32, maxLength: 32)),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Handshake status',
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'success', type: 'boolean', example: true),
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['pending', 'approved', 'cancelled', 'expired']),
                    new OA\Property(property: 'redirect_path', type: 'string', nullable: true),
                ], type: 'object'),
            ])
        ),
    ]
)]
class ClaimTelegramLoginHandshakeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        string $nonce,
        TelegramLoginHandshakeService $handshakeService,
    ): JsonResponse {
        $result = $handshakeService->claim($nonce, $request->session()->getId());

        if ($result['status'] !== 'approved') {
            return $this->sendSuccess(['status' => $result['status']]);
        }

        Auth::guard('web')->login($result['user'], true);
        $request->session()->regenerate();

        return $this->sendSuccess([
            'status' => 'approved',
            'redirect_path' => $result['redirect_path'],
        ]);
    }
}
