<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PlacementRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests/{id}/confirm',
    summary: 'Re-open a cancelled or expired placement request',
    tags: ['Placement Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request to re-open',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Placement request re-opened successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequest'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Only the pet owner can re-open the placement request'
        ),
        new OA\Response(
            response: 409,
            description: 'Conflict - Placement request is not cancelled or expired, or its base version is stale'
        ),
    ]
)]
class ConfirmPlacementRequestController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, PlacementRequest $placementRequest): JsonResponse
    {
        $user = $request->user();

        /** @var Pet $pet */
        $pet = $placementRequest->pet;
        if (! $user instanceof User || ! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.placement.only_owner_can_reopen'), 403);
        }

        $this->authorize('confirm', $placementRequest);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $placementRequest)) {
            return $conflict;
        }

        if (! in_array($placementRequest->status, [
            PlacementRequestStatus::CANCELLED,
            PlacementRequestStatus::EXPIRED,
        ], true)) {
            return $this->sendError(__('messages.placement.only_closed_can_reopen'), 409);
        }

        DB::transaction(function () use ($placementRequest): void {
            $attributes = ['status' => PlacementRequestStatus::OPEN];

            if ($placementRequest->expires_at?->isPast()) {
                $attributes['expires_at'] = null;
            }

            $placementRequest->update($attributes);
        });

        return $this->sendSuccess($placementRequest->fresh());
    }
}
