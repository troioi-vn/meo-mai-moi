<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementResponseStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests/{id}/reject',
    summary: 'Cancel an open placement request',
    tags: ['Placement Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request to cancel',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Placement request cancelled successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequest'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Only the pet owner can cancel the placement request'
        ),
        new OA\Response(
            response: 409,
            description: 'Conflict - Placement request is not open, or its base version is stale'
        ),
    ]
)]
class RejectPlacementRequestController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, PlacementRequest $placementRequest): JsonResponse
    {
        $user = $request->user();

        /** @var Pet $pet */
        $pet = $placementRequest->pet;
        if (! $user instanceof User || ! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.placement.only_owner_can_cancel'), 403);
        }

        $this->authorize('reject', $placementRequest);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $placementRequest)) {
            return $conflict;
        }

        if ($placementRequest->status !== PlacementRequestStatus::OPEN) {
            return $this->sendError(__('messages.placement.only_open_can_cancel'), 409);
        }

        DB::transaction(function () use ($placementRequest, $pet): void {
            $outstandingResponses = $placementRequest->responses()
                ->where('status', PlacementResponseStatus::RESPONDED)
                ->with('helperProfile.user')
                ->get();

            $placementRequest->markAsCancelled();

            foreach ($outstandingResponses as $response) {
                $response->update([
                    'status' => PlacementResponseStatus::REJECTED,
                    'rejected_at' => now(),
                ]);

                $helper = $response->helperProfile->user;
                if (! $helper instanceof User) {
                    continue;
                }

                $this->notificationService->send(
                    $helper,
                    NotificationType::HELPER_RESPONSE_REJECTED->value,
                    [
                        'message' => 'The placement request for '.$pet->name.' was cancelled, so your offer is no longer pending. Thank you for reaching out!',
                        'link' => '/requests/'.$placementRequest->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                        'placement_request_id' => $placementRequest->id,
                        'placement_response_id' => $response->id,
                    ],
                );
            }
        });

        return $this->sendSuccess($placementRequest->fresh());
    }
}
