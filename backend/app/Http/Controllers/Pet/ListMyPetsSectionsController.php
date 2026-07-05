<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
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
            content: new OA\JsonContent(ref: '#/components/schemas/PetSectionsResponse')
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

    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->requireAuth($request);

        // Owned (current owner)
        $owned = Pet::whereHas('owners', function ($query) use ($user): void {
            $query->where('users.id', $user->id);
        })->with('petType')->withCardHealthSummary()->get();

        // Fostering active/past via relationships
        $activeFostering = Pet::whereHas('relationships', function ($query) use ($user): void {
            $query->where('user_id', $user->id)
                ->where('relationship_type', PetRelationshipType::FOSTER)
                ->whereNull('end_at');
        })->with('petType')->withCardHealthSummary()->get();

        $pastFostering = Pet::whereHas('relationships', function ($query) use ($user): void {
            $query->where('user_id', $user->id)
                ->where('relationship_type', PetRelationshipType::FOSTER)
                ->whereNotNull('end_at');
        })->with('petType')->withCardHealthSummary()->get();

        $owned->each->append('health_summary');
        $activeFostering->each->append('health_summary');
        $pastFostering->each->append('health_summary');

        return $this->sendSuccess([
            'owned' => $owned->values(),
            'fostering_active' => $activeFostering->values(),
            'fostering_past' => $pastFostering->values(),
        ]);
    }
}
