<?php

namespace App\Http\Controllers\PetMicrochip;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Delete(
 *     path="/api/pets/{pet}/microchips/{microchip}",
 *     summary="Delete a microchip record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="microchip", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Deleted",
 *
 *         @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found")
 * )
 */
class DeletePetMicrochipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, PetMicrochip $microchip)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->validatePetResource($request, $pet, 'microchips', $microchip);

        $microchip->delete();

        return $this->sendSuccessWithMeta(true, 'Microchip record deleted successfully.');
    }
}
