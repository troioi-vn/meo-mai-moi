<?php

namespace App\Http\Controllers\PetMicrochip;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{pet}/microchips",
 *     summary="List microchips for a pet",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
 *
 *     @OA\Response(
 *         response=200,
 *         description="List of microchips",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PetMicrochip")),
 *                 @OA\Property(property="links", type="object"),
 *                 @OA\Property(property="meta", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found"),
 *     @OA\Response(response=422, description="Feature not available for this pet type")
 * )
 */
class ListPetMicrochipsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'view', $pet);
        $this->ensurePetCapability($pet, 'microchips');

        $microchips = $pet->microchips()
            ->orderBy('implanted_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        $payload = $this->paginatedResponse($microchips, [
            'meta' => array_merge($this->paginatedResponse($microchips)['meta'], [
                'path' => $microchips->path(),
            ]),
        ]);

        return response()->json(['data' => $payload]);
    }
}
