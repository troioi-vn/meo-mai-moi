<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/leave',
    summary: 'Leave a pet (end all active relationships for the current user)',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Left successfully'),
        new OA\Response(response: 409, description: 'Cannot leave — last owner'),
    ]
)]
class LeavePetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, PetRelationshipService $service)
    {
        /** @var \App\Models\User $user */
        $user = $this->requireAuth($request);

        // Check if user has any active relationship with this pet
        $hasRelationship = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $user->id)
            ->whereNull('end_at')
            ->exists();

        if (! $hasRelationship) {
            return $this->sendError(__('messages.pets.no_relationship'), 404);
        }

        // If user is an owner, check they're not the last one
        if ($pet->isOwnedBy($user)) {
            $ownerCount = PetRelationship::where('pet_id', $pet->id)
                ->where('relationship_type', PetRelationshipType::OWNER)
                ->whereNull('end_at')
                ->count();

            if ($ownerCount <= 1) {
                return $this->sendError(__('messages.pets.last_owner_cannot_leave'), 409);
            }
        }

        $service->endAllActiveRelationships($user, $pet);

        return $this->sendSuccess(null);
    }
}
