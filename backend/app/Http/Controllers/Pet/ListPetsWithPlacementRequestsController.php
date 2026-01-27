<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PlacementRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/placement-requests',
    summary: 'Get a list of pets with open placement requests',
    tags: ['Pets'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'A list of pets with open placement requests',
            content: new OA\JsonContent(ref: '#/components/schemas/PetArrayResponse')
        ),
    ]
)]
class ListPetsWithPlacementRequestsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $pets = Pet::whereHas('placementRequests', function ($query): void {
            $query->where('status', PlacementRequestStatus::OPEN);
        })
            ->with(['placementRequests', 'petType', 'city'])
            ->get();

        return $this->sendSuccess($pets);
    }
}
