<?php

namespace App\Http\Controllers;

use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;

class SettingsController extends Controller
{
    use ApiResponseTrait;

    private SettingsService $settingsService;

    public function __construct(SettingsService $settingsService)
    {
        $this->settingsService = $settingsService;
    }

    /**
     * @OA\Get(
     *     path="/api/settings/public",
     *     summary="Get public settings",
     *     description="Retrieve public settings that can be exposed to frontend, such as invite-only mode status.",
     *     tags={"Settings"},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Public settings retrieved successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="invite_only_enabled", type="boolean", example=true)
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Unable to retrieve settings")
     *         )
     *     )
     * )
     */
    public function public()
    {
        try {
            $settings = $this->settingsService->getPublicSettings();

            return response()->json([
                'data' => $settings,
            ])->header('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        } catch (\Exception $e) {
            return $this->sendError(
                'Unable to retrieve settings: '.$e->getMessage(),
                500
            );
        }
    }

    /**
     * Get invite-only status specifically (lightweight endpoint)
     */
    public function inviteOnlyStatus()
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
