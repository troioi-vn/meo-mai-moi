<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Enums\NotificationType;
use App\Enums\PlacementResponseStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests/{id}/responses',
    summary: 'Respond to a placement request',
    tags: ['Placement Request Responses'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'message', type: 'string', example: 'I can help with this pet!', maxLength: 1000),
                new OA\Property(property: 'helper_profile_id', type: 'integer', example: 1, description: 'Optional helper profile ID if user has multiple'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Response submitted successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequestResponse'),
                    new OA\Property(property: 'message', type: 'string', example: 'Response submitted successfully.'),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden - Request not active or helper blocked'),
        new OA\Response(response: 404, description: 'Placement request not found'),
    ]
)]
class StorePlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, int $placementRequestId)
    {
        $placementRequest = PlacementRequest::find($placementRequestId);
        if (! $placementRequest) {
            return $this->sendError(__('messages.placement.not_found'), 404);
        }
        /** @var PlacementRequest $placementRequest */
        if (! $placementRequest->isActive()) {
            return $this->sendError(__('messages.placement.not_active'), 403);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Validate helper profile
        $helperProfileId = $request->input('helper_profile_id');

        /** @var \App\Models\HelperProfile|null $helperProfile */
        $helperProfile = null;
        if ($helperProfileId) {
            $helperProfile = $user->helperProfiles()->find($helperProfileId);
        } else {
            $helperProfile = $user->helperProfiles()->first();
        }

        if (! $helperProfile) {
            $message = $helperProfileId ? 'Invalid helper profile.' : 'You need a helper profile to respond to placement requests.';

            return $this->sendError($message, 403);
        }

        /** @var \App\Models\HelperProfile $helperProfile */
        if (! $placementRequest->canHelperRespond($helperProfile->id)) {
            // If blocked (rejected), treat as forbidden rather than conflict
            if ($placementRequest->isHelperBlocked($helperProfile->id)) {
                return $this->sendError(__('messages.placement.cannot_respond'), 403);
            }

            // If they already responded and it's active, return 409 for frontend to handle
            if ($placementRequest->hasResponseFrom($helperProfile->id)) {
                return $this->sendError(__('messages.placement.already_responded'), 409);
            }

            return $this->sendError(__('messages.placement.cannot_respond'), 403);
        }

        // Owner cannot respond to their own request
        if ($placementRequest->user_id === $user->id) {
            return $this->sendError(__('messages.placement.cannot_self_respond'), 403);
        }

        $validatedData = $request->validate([
            'message' => 'nullable|string|max:1000',
        ]);

        $response = PlacementRequestResponse::create([
            /** @phpstan-ignore-next-line */
            'placement_request_id' => $placementRequest->id,
            /** @phpstan-ignore-next-line */
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
            'message' => $validatedData['message'] ?? null,
            'responded_at' => now(),
        ]);

        // Send notification to pet owner
        $pet = $placementRequest->pet;
        $this->notificationService->send(
            $placementRequest->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [
                'message' => $user->name.' wants to help with '.$pet->name.'. Review their response!',
                'link' => '/requests/'.$placementRequest->id,
                'helper_name' => $user->name,
                'pet_name' => $pet->name,
                'pet_id' => $pet->id,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ]
        );

        return $this->sendSuccess(
            new PlacementRequestResponseResource($response),
            201
        );
    }
}
