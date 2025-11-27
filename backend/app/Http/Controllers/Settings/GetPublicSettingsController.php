<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;

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
class GetPublicSettingsController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private SettingsService $settingsService
    ) {}

    public function __invoke()
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
}
