<?php

declare(strict_types=1);

namespace App\Http\Controllers\TransferRequest;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/transfer-requests/{id}/responder-profile',
    summary: "Get the responder's helper profile for a given pet transfer request",
    tags: ['Transfer Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the transfer request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: "The responder's helper profile",
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/HelperProfile'),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Helper profile not found'),
    ]
)]
class GetResponderProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('viewResponderProfile', $transferRequest);

        // Load via the new response relation
        $transferRequest->load('placementRequestResponse.helperProfile.photos', 'placementRequestResponse.helperProfile.user');

        $profile = $transferRequest->helperProfile;

        if (! $profile) {
            return $this->sendError('Helper profile not found.', 404);
        }

        return $this->sendSuccess($profile);
    }
}
