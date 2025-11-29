<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Get(
 *     path="/api/pets/featured",
 *     summary="Get a list of featured pets",
 *     tags={"Pets"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of featured pets",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(ref="#/components/schemas/Pet")
 *         )
 *     )
 * )
 */
class ListFeaturedPetsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        // For now, return a random selection of 3 pets as featured (excluding dead pets)
        $featuredPets = Pet::whereNotIn('status', [PetStatus::DECEASED, PetStatus::DELETED])
            ->with('petType')
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return $this->sendSuccess($featuredPets);
    }
}
