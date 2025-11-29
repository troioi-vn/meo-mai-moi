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
 * @OA\Put(
 *     path="/api/pets/{pet}/microchips/{microchip}",
 *     summary="Update a microchip record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="microchip", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="chip_number", type="string"),
 *             @OA\Property(property="issuer", type="string"),
 *             @OA\Property(property="implanted_at", type="string", format="date")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/PetMicrochip"))
 *     ),
 *
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdatePetMicrochipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, PetMicrochip $microchip)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->validatePetResource($request, $pet, 'microchips', $microchip);

        $validated = $this->validateWithErrorHandling($request, [
            'chip_number' => [
                'sometimes',
                'required',
                'string',
                'min:10',
                'max:20',
                $this->uniqueValidationRule('pet_microchips', 'chip_number', [], $microchip->id),
            ],
            'issuer' => $this->textValidationRules(false),
            'implanted_at' => $this->dateValidationRules(false, false),
        ]);

        $microchip->update($validated);

        return $this->sendSuccessWithMeta($microchip, 'Microchip record updated successfully.');
    }
}
