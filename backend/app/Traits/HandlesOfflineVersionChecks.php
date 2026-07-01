<?php

declare(strict_types=1);

namespace App\Traits;

use App\Services\Offline\OfflineVersionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait HandlesOfflineVersionChecks
{
    protected function rejectUnlessBaseVersionMatches(
        Request $request,
        Model $model,
        mixed $serverValue = null,
    ): ?JsonResponse {
        $baseVersion = $request->input('base_version');

        if (! is_string($baseVersion) || trim($baseVersion) === '') {
            return null;
        }

        /** @var OfflineVersionService $versionService */
        $versionService = app(OfflineVersionService::class);

        if ($versionService->matchesBaseVersion($model, $baseVersion)) {
            return null;
        }

        return $this->sendVersionConflict(
            $serverValue ?? $model,
            trim($baseVersion),
            $versionService->serializeVersion($model),
        );
    }

    protected function sendVersionConflict(
        mixed $serverValue,
        string $clientBaseVersion,
        string $serverVersion,
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'data' => [
                'server_value' => $serverValue,
                'server_version' => $serverVersion,
                'client_base_version' => $clientBaseVersion,
            ],
            'message' => __('messages.offline.version_conflict'),
            'error' => __('messages.offline.version_conflict'),
        ], 409);
    }
}
