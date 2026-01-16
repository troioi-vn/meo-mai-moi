<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/my-pets/sections',
    summary: 'Get the pets of the authenticated user, organized by section',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: "A list of the user's pets, organized by section",
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'owned', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                    new OA\Property(property: 'fostering_active', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                    new OA\Property(property: 'fostering_past', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                    new OA\Property(property: 'transferred_away', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class ListMyPetsSectionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request)
    {
        $user = $this->requireAuth($request);

        // Owned (current owner)
        $owned = Pet::whereHas('owners', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        })->with('petType')->get();

        // Fostering active/past via relationships
        $activeFostering = Pet::whereHas('relationships', function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->where('relationship_type', PetRelationshipType::FOSTER)
                ->whereNull('end_at');
        })->with('petType')->get();

        $pastFostering = Pet::whereHas('relationships', function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->where('relationship_type', PetRelationshipType::FOSTER)
                ->whereNotNull('end_at');
        })->with('petType')->get();

        // Transferred away: pets that the user used to own but no longer does
        // Uses pet_relationships to find pets with ended ownership
        $transferredPetIds = PetRelationship::where('user_id', $user->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNotNull('end_at')
            ->pluck('pet_id')
            ->unique();

        $transferredAway = Pet::whereIn('id', $transferredPetIds)
            ->whereDoesntHave('relationships', function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->where('relationship_type', PetRelationshipType::OWNER)
                    ->whereNull('end_at');
            })
            ->with('petType')
            ->get();

        return $this->sendSuccess([
            'owned' => $owned->values(),
            'fostering_active' => $activeFostering->values(),
            'fostering_past' => $pastFostering->values(),
            'transferred_away' => $transferredAway->values(),
        ]);
    }
}
