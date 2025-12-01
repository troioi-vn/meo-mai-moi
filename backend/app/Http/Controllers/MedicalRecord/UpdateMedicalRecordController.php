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
 * @OA\Put(
 *     path="/api/pets/{pet}/medical-records/{record}",
 *     summary="Update a medical record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(required=true, @OA\JsonContent(
 *
 *         @OA\Property(property="record_type", type="string", enum={"vaccination", "vet_visit", "medication", "treatment", "other"}),
 *         @OA\Property(property="description", type="string"),
 *         @OA\Property(property="record_date", type="string", format="date"),
 *         @OA\Property(property="vet_name", type="string"),
 *         @OA\Property(property="attachment_url", type="string")
 *     )),
 *
 *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalRecord"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateMedicalRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, MedicalRecord $record)
    {
        $this->validatePetResource($request, $pet, 'medical', $record);

        $validated = $this->validateWithErrorHandling($request, [
            'record_type' => ['sometimes', 'string', 'in:vaccination,vet_visit,medication,treatment,other'],
            'description' => $this->textValidationRules(false, 2000),
            'record_date' => $this->dateValidationRules(false, false),
            'vet_name' => $this->textValidationRules(false, 255),
            'attachment_url' => ['nullable', 'string', 'url', 'max:2048'],
        ]);

        $record->update($validated);

        return $this->sendSuccess($record);
    }
}
