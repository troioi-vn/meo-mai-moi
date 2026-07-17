<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class RevokeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['token' => ['required', 'string', 'max:4096']]);
        PersonalAccessToken::findToken($validated['token'])?->delete();

        return $this->sendSuccess(['revoked' => true]);
    }
}
