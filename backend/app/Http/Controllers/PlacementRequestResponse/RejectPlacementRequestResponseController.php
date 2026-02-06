<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequestResponse;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-responses/{id}/reject',
    summary: 'Reject a response to a placement request',
    tags: ['Placement Request Responses'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement response',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Response rejected successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequestResponse'),
                    new OA\Property(property: 'message', type: 'string', example: 'Response rejected successfully.'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Not authorized or invalid state transition'
        ),
        new OA\Response(
            response: 404,
            description: 'Placement response not found'
        ),
    ]
)]
class RejectPlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, int $id)
    {
        $response = PlacementRequestResponse::findOrFail($id);

        $this->authorize('reject', $response);

        if ($response->reject()) {
            // Send notification to helper
            $placementRequest = $response->placementRequest;
            $pet = $placementRequest->pet;
            $this->notificationService->send(
                $response->helperProfile->user,
                NotificationType::HELPER_RESPONSE_REJECTED->value,
                [
                    'message' => 'Your offer to help with '.$pet->name.' was declined. Thank you for reaching out!',
                    'link' => '/requests/'.$placementRequest->id,
                    'pet_name' => $pet->name,
                    'pet_id' => $pet->id,
                    'placement_request_id' => $placementRequest->id,
                    'placement_response_id' => $response->id,
                ]
            );

            return $this->sendSuccess(
                new PlacementRequestResponseResource($response)
            );
        }

        return $this->sendError(__('messages.placement.response_cannot_reject'), 403);
    }
}
