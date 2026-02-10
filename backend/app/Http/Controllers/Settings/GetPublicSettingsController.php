<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/settings/public',
    summary: 'Get public settings',
    description: 'Retrieve public settings that can be exposed to frontend, such as invite-only mode status.',
    tags: ['Settings'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Public settings retrieved successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'object', properties: [
                        new OA\Property(property: 'invite_only_enabled', type: 'boolean', example: true),
                    ]),
                ]
            )
        ),
        new OA\Response(
            response: 500,
            description: 'Server error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Unable to retrieve settings'),
                ]
            )
        ),
    ]
)]
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

            return $this->sendSuccess($settings)
                ->header('Cache-Control', 'no-cache'); // Settings can change at any time via admin toggle
        } catch (\Exception $e) {
            return $this->sendError(
                'Unable to retrieve settings: '.$e->getMessage(),
                500
            );
        }
    }
}
