<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\TelegramAccountService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/telegram/disconnect',
    tags: ['Telegram'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiSuccessMessageResponse')
        ),
    ]
)]
class DisconnectTelegramController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(TelegramAccountService $telegramAccountService): JsonResponse
    {
        $user = Auth::user();

        $telegramAccountService->disconnect($user);

        return $this->sendSuccessWithMeta(null, 'Telegram disconnected successfully');
    }
}
