<?php

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/pets/{pet}/medical-records",
 *     summary="Create a medical record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(required=true, @OA\JsonContent(
 *         required={"record_type","description","record_date"},
 *
 *         @OA\Property(property="record_type", type="string", enum={"vaccination", "vet_visit", "medication", "treatment", "other"}, example="vet_visit"),
 *         @OA\Property(property="description", type="string", example="Annual checkup - all clear"),
 *         @OA\Property(property="record_date", type="string", format="date", example="2024-06-01"),
 *         @OA\Property(property="vet_name", type="string", example="Dr. Smith"),
 *         @OA\Property(property="attachment_url", type="string", example="https://example.com/attachment.pdf"),
 *     )),
 *
 *     @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalRecord"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class StoreMedicalRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'medical');

        $validated = $this->validateWithErrorHandling($request, [
            'record_type' => ['required', 'string', 'in:vaccination,vet_visit,medication,treatment,other'],
            'description' => $this->textValidationRules(true, 2000),
            'record_date' => $this->dateValidationRules(true, false),
            'vet_name' => $this->textValidationRules(false, 255),
            'attachment_url' => ['nullable', 'string', 'url', 'max:2048'],
        ]);

        $created = $pet->medicalRecords()->create($validated);

        return $this->sendSuccess($created, 201);
    }
}
