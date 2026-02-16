<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/telegram/status',
    tags: ['Telegram'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'is_connected', type: 'boolean'),
                        ]
                    ),
                ]
            )
        ),
    ]
)]
class GetTelegramStatusController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $user = Auth::user();

        return $this->sendSuccess([
            'is_connected' => ! empty($user->telegram_chat_id),
        ]);
    }
}
