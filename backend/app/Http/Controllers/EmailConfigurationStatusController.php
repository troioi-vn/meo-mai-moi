<?php

namespace App\Http\Controllers;

use App\Services\EmailConfigurationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class EmailConfigurationStatusController extends Controller
{
    use ApiResponseTrait;

    private EmailConfigurationService $emailConfigService;

    public function __construct(EmailConfigurationService $emailConfigService)
    {
        $this->emailConfigService = $emailConfigService;
        $this->middleware('auth:sanctum');
    }

    /**
     * Get email configuration status.
     *
     * @OA\Get(
     *     path="/api/email/configuration-status",
     *     summary="Check email configuration status",
     *     description="Check if email system is properly configured and operational.",
     *     tags={"Email Configuration"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Email configuration status",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="enabled", type="boolean", example=true),
     *             @OA\Property(property="provider", type="string", example="smtp"),
     *             @OA\Property(property="from_address", type="string", example="noreply@example.com"),
     *             @OA\Property(property="status", type="string", example="active")
     *         )
     *     )
     * )
     */
    public function status(Request $request)
    {
        $isEnabled = $this->emailConfigService->isEmailEnabled();
        $activeConfig = $this->emailConfigService->getActiveConfiguration();

        $status = [
            'enabled' => $isEnabled,
            'provider' => $activeConfig?->provider ?? null,
            'from_address' => $activeConfig?->config['from_address'] ?? null,
            'status' => $activeConfig?->status->value ?? 'not_configured',
        ];

        return $this->sendSuccess($status);
    }
}
