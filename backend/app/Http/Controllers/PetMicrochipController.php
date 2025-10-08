<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="PetMicrochip",
 *     title="PetMicrochip",
 *     description="Pet Microchip model",
 *
 *     @OA\Property(property="id", type="integer", format="int64", description="Microchip ID"),
 *     @OA\Property(property="pet_id", type="integer", format="int64", description="ID of the associated pet"),
 *     @OA\Property(property="chip_number", type="string", description="Unique microchip number"),
 *     @OA\Property(property="issuer", type="string", nullable=true, description="Microchip issuer/manufacturer"),
 *     @OA\Property(property="implanted_at", type="string", format="date", nullable=true, description="Date the microchip was implanted"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of microchip record creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last microchip record update")
 * )
 */
class PetMicrochipController extends Controller
{
    use ApiResponseTrait, HandlesAuthentication, HandlesPetResources, HandlesValidation;

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/microchips",
     *     summary="List microchips for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="List of microchips",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PetMicrochip")),
     *                 @OA\Property(property="links", type="object"),
     *                 @OA\Property(property="meta", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Feature not available for this pet type")
     * )
     */
    public function index(Request $request, Pet $pet)
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
                'to' => $microchips->lastItem(),
                'total' => $microchips->total(),
            ],
        ];

        return response()->json(['data' => $payload]);
    }

    /**
     * @OA\Post(
     *     path="/api/pets/{pet}/microchips",
     *     summary="Add a new microchip record for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="pet",
     *         in="path",
     *         required=true,
     *         description="ID of the pet to add a microchip record for",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"chip_number"},
     *
     *             @OA\Property(property="chip_number", type="string", example="982000123456789"),
     *             @OA\Property(property="issuer", type="string", example="HomeAgain"),
     *             @OA\Property(property="implanted_at", type="string", format="date", example="2024-01-15")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Microchip record created successfully",
     *
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/PetMicrochip")
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->ensurePetCapability($pet, 'microchips');

        $validated = $this->validateWithErrorHandling($request, [
            'chip_number' => [
                'required',
                'string',
                'min:10',
                'max:20',
                $this->uniqueValidationRule('pet_microchips', 'chip_number'),
            ],
            'issuer' => $this->textValidationRules(false),
            'implanted_at' => $this->dateValidationRules(false, false),
        ]);

        $microchip = $pet->microchips()->create($validated);

        return $this->sendSuccessWithMeta($microchip, 'Microchip record created successfully.', 201);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/microchips/{microchip}",
     *     summary="Get a specific microchip record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="microchip", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="OK",
     *         @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/PetMicrochip"))
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Request $request, Pet $pet, PetMicrochip $microchip)
    {
        $this->authorizeUser($request, 'view', $pet);
        $this->validatePetResource($request, $pet, 'microchips', $microchip);

        return $this->sendSuccess($microchip);
    }

    /**
     * @OA\Put(
     *     path="/api/pets/{pet}/microchips/{microchip}",
     *     summary="Update a microchip record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="microchip", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="chip_number", type="string"),
     *             @OA\Property(property="issuer", type="string"),
     *             @OA\Property(property="implanted_at", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="OK",
     *         @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/PetMicrochip"))
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, Pet $pet, PetMicrochip $microchip)
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

    /**
     * @OA\Delete(
     *     path="/api/pets/{pet}/microchips/{microchip}",
     *     summary="Delete a microchip record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="microchip", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Deleted",
     *         @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Request $request, Pet $pet, PetMicrochip $microchip)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->validatePetResource($request, $pet, 'microchips', $microchip);

        $microchip->delete();

        return $this->sendSuccessWithMeta(true, 'Microchip record deleted successfully.');
    }
}