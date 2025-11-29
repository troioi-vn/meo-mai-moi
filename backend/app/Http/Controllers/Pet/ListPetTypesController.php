<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\PetType;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Get(
 *     path="/api/pet-types",
 *     summary="Get all available pet types",
 *     tags={"Pet Types"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of available pet types",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(
 *                 type="object",
 *
 *                 @OA\Property(property="id", type="integer", example=1),
 *                 @OA\Property(property="name", type="string", example="Cat"),
 *                 @OA\Property(property="slug", type="string", example="cat"),
 *                 @OA\Property(property="description", type="string", example="Feline companions")
 *             )
 *         )
 *     )
 * )
 */
class ListPetTypesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $petTypes = PetType::active()->ordered()->get();

        return $this->sendSuccess($petTypes);
    }
}
