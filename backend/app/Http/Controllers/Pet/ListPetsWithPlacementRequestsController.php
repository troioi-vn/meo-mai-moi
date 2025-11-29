<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PlacementRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/placement-requests",
 *     summary="Get a list of pets with open placement requests",
 *     tags={"Pets"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of pets with open placement requests",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(ref="#/components/schemas/Pet")
 *         )
 *     )
 * )
 */
class ListPetsWithPlacementRequestsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $pets = Pet::whereHas('placementRequests', function ($query) {
            $query->where('status', PlacementRequestStatus::OPEN);
        })->with(['placementRequests', 'petType'])->get();

        return $this->sendSuccess($pets);
    }
}
