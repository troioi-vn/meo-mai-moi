<?php

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{pet}/weights",
 *     summary="List weight records for a pet",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
 *
 *     @OA\Response(
 *         response=200,
 *         description="List of weight records",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/WeightHistory")),
 *                 @OA\Property(property="links", type="object"),
 *                 @OA\Property(property="meta", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListWeightHistoryController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'weight');

        $items = $pet->weightHistories()->orderByDesc('record_date')->paginate(25);
        $payload = $this->paginatedResponse($items, [
            'meta' => array_merge($this->paginatedResponse($items)['meta'], [
                'path' => $items->path(),
            ]),
        ]);

        return response()->json(['data' => $payload]);
    }
}
