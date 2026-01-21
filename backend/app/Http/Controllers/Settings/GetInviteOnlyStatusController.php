<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;

/**
 * Get invite-only status specifically (lightweight endpoint)
 */
class GetInviteOnlyStatusController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private SettingsService $settingsService
    ) {}

    public function __invoke()
    {
        try {
            $isEnabled = $this->settingsService->isInviteOnlyEnabled();

            return response()->json([
                'invite_only_enabled' => $isEnabled,
            ])->header('Cache-Control', 'public, max-age=300');
        } catch (\Exception $e) {
            return $this->sendError(
                'Unable to retrieve invite-only status: '.$e->getMessage(),
                500
            );
        }
    }
}
