<?php

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{pet}/medical-records/{record}",
 *     summary="Get a single medical record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalRecord"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found")
 * )
 */
class ShowMedicalRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, MedicalRecord $record)
    {
        $this->validatePetResource($request, $pet, 'medical', $record);

        return $this->sendSuccess($record);
    }
}
