<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\EmailConfigurationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class EmailConfigurationStatusController extends Controller
{
    use ApiResponseTrait;

    private EmailConfigurationService $emailConfigService;

    public function __construct(EmailConfigurationService $emailConfigService)
    {
        $this->emailConfigService = $emailConfigService;
        $this->middleware('auth:sanctum');
    }

    #[OA\Get(
        path: '/api/email/configuration-status',
        summary: 'Check email configuration status',
        description: 'Check if email system is properly configured and operational.',
        tags: ['Email Configuration'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Email configuration status',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'enabled', type: 'boolean', example: true),
                        new OA\Property(property: 'provider', type: 'string', example: 'smtp'),
                        new OA\Property(property: 'from_address', type: 'string', example: 'noreply@example.com'),
                        new OA\Property(property: 'status', type: 'string', example: 'active'),
                    ]
                )
            ),
        ]
    )]
    public function status(Request $request)
    {
        $isEnabled = $this->emailConfigService->isEmailEnabled();
        $activeConfig = $this->emailConfigService->getActiveConfiguration();

        $status = [
            'enabled' => $isEnabled,
            'provider' => $activeConfig?->provider,
            'from_address' => $activeConfig?->config['from_address'] ?? null,
            'status' => $activeConfig?->status->value ?? 'not_configured',
        ];

        return $this->sendSuccess($status);
    }
}
