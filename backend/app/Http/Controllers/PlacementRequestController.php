<?php

namespace App\Http\Controllers;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Http\Resources\PlacementRequestResource;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * @OA\Schema(
 *     schema="PlacementRequest",
 *     type="object",
 *     title="PlacementRequest",
 *     required={"id", "pet_id", "user_id", "request_type", "status"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="pet_id", type="integer", example=2),
 *     @OA\Property(property="user_id", type="integer", example=5),
 *     @OA\Property(property="request_type", type="string", example="adoption"),
 *     @OA\Property(property="status", type="string", example="pending"),
 *     @OA\Property(property="notes", type="string", example="Looking for a loving home."),
 *     @OA\Property(property="expires_at", type="string", format="date", example="2025-08-01"),
 *     @OA\Property(property="start_date", type="string", format="date", example="2025-08-05"),
 *     @OA\Property(property="end_date", type="string", format="date", example="2025-08-20")
 * )
 */
class PlacementRequestController extends Controller
{
    use ApiResponseTrait;

    protected PetCapabilityService $capabilityService;

    public function __construct(PetCapabilityService $capabilityService)
    {
        $this->capabilityService = $capabilityService;
    }

    /**
     * @OA\Post(
     *     path="/api/placement-requests",
     *     summary="Create a new placement request",
     *     tags={"Placement Requests"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"pet_id", "request_type"},
     *
     *             @OA\Property(property="pet_id", type="integer", example=1),
     *             @OA\Property(property="request_type", type="string", enum=App\Enums\PlacementRequestType::class, example="permanent"),
     *             @OA\Property(property="notes", type="string", example="Looking for a loving home."),
     *             @OA\Property(property="expires_at", type="string", format="date", example="2025-12-31"),
     *             @OA\Property(property="start_date", type="string", format="date", example="2025-08-05"),
     *             @OA\Property(property="end_date", type="string", format="date", example="2025-08-20")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Placement request created successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="data", ref="#/components/schemas/PlacementRequest")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Conflict - Active placement request of this type already exists"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'request_type' => ['required', new \Illuminate\Validation\Rules\Enum(PlacementRequestType::class)],
            'notes' => 'nullable|string',
            'expires_at' => 'nullable|date|after:now',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $pet = Pet::findOrFail($validatedData['pet_id']);

        if (! $pet) {
            return $this->sendError('Pet not found.', 404);
        }

        // Ensure this pet type supports placement requests
        $this->capabilityService->ensure($pet, 'placement');

        if ($pet->user_id !== Auth::id()) {
            return $this->sendError('You are not authorized to create a placement request for this pet.', 403);
        }

        // Implement the business rule: One active placement request per type per pet.
        $existingRequest = PlacementRequest::where('pet_id', $pet->id)
            ->where('request_type', $validatedData['request_type'])
            ->whereIn('status', ['open', 'pending_review'])
            ->exists();

        if ($existingRequest) {
            return $this->sendError('An active placement request of this type already exists for this pet.', 409);
        }

        // Business rule: Block creating new placement requests while foster assignment is active
        $activeFosterAssignment = $pet->activeFosterAssignment()->exists();
        if ($activeFosterAssignment) {
            return $this->sendError('Cannot create placement requests while the pet has an active foster assignment.', 409);
        }

        $placementRequest = PlacementRequest::create([
            'pet_id' => $pet->id,
            'user_id' => Auth::id(),
            'request_type' => $validatedData['request_type'],
            'notes' => $validatedData['notes'] ?? null,
            'expires_at' => $validatedData['expires_at'] ?? null,
            'start_date' => $validatedData['start_date'] ?? null,
            'end_date' => $validatedData['end_date'] ?? null,
            'status' => PlacementRequestStatus::OPEN,
        ]);
        $placementRequest->refresh();

        return $this->sendSuccess(new PlacementRequestResource($placementRequest), 201);
    }

    /**
     * @OA\Delete(
     *     path="/api/placement-requests/{id}",
     *     summary="Delete a placement request",
     *     tags={"Placement Requests"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the placement request to delete",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=204,
     *         description="Placement request deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     )
     * )
     */
    public function destroy(PlacementRequest $placementRequest)
    {
        $this->authorize('delete', $placementRequest);
        $placementRequest->delete();

        return $this->sendSuccess(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/api/placement-requests/{id}/confirm",
     *     summary="Confirm a placement request",
     *     tags={"Placement Requests"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the placement request to confirm",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Placement request confirmed successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/PlacementRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     )
     * )
     */
    public function confirm(PlacementRequest $placementRequest)
    {
        $this->authorize('confirm', $placementRequest);

        // TODO: Add logic to confirm the placement request
        return $this->sendSuccess($placementRequest);
    }

    /**
     * @OA\Post(
     *     path="/api/placement-requests/{id}/reject",
     *     summary="Reject a placement request",
     *     tags={"Placement Requests"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the placement request to reject",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Placement request rejected successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/PlacementRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     )
     * )
     */
    public function reject(PlacementRequest $placementRequest)
    {
        $this->authorize('reject', $placementRequest);

        // TODO: Add logic to reject the placement request
        return $this->sendSuccess($placementRequest);
    }
}
