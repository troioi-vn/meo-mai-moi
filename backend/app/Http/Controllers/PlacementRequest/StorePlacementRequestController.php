<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResource;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Enum;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests',
    summary: 'Create a new placement request',
    tags: ['Placement Requests'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['pet_id', 'request_type'],
            properties: [
                new OA\Property(property: 'pet_id', type: 'integer', example: 1),
                new OA\Property(property: 'request_type', type: 'string', enum: PlacementRequestType::class, example: 'permanent'),
                new OA\Property(property: 'notes', type: 'string', example: 'Looking for a loving home.'),
                new OA\Property(property: 'expires_at', type: 'string', format: 'date', example: '2025-12-31'),
                new OA\Property(property: 'start_date', type: 'string', format: 'date', example: '2025-08-05'),
                new OA\Property(property: 'end_date', type: 'string', format: 'date', example: '2025-08-20'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Placement request created successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequest'),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden'
        ),
        new OA\Response(
            response: 409,
            description: 'Conflict - Active placement request of this type already exists'
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class StorePlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected PetCapabilityService $capabilityService
    ) {
    }

    public function __invoke(Request $request)
    {
        $validatedData = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'request_type' => ['required', new Enum(PlacementRequestType::class)],
            'notes' => 'nullable|string',
            'expires_at' => 'nullable|date|after:now',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $pet = Pet::findOrFail($validatedData['pet_id']);

        /** @var \App\Models\Pet $pet */

        // Ensure this pet type supports placement requests
        $this->capabilityService->ensure($pet, 'placement');

        if (! $pet->isOwnedBy(Auth::user())) {
            return $this->sendError('You are not authorized to create a placement request for this pet.', 403);
        }

        // Implement the business rule: One active placement request per type per pet.
        $existingRequest = PlacementRequest::where('pet_id', $pet->id)
            ->where('request_type', $validatedData['request_type'])
            ->whereIn('status', ['open', 'pending_transfer', 'active'])
            ->exists();

        if ($existingRequest) {
            return $this->sendError('An active placement request of this type already exists for this pet.', 409);
        }

        // TODO: FosterAssignment removed - this check needs to be reimplemented
        // Previously blocked creating placement requests while foster assignment was active

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
}
