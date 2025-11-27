<?php

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\WeightHistory;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Put(
 *     path="/api/pets/{pet}/weights/{weight}",
 *     summary="Update a weight record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="weight", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(required=true, @OA\JsonContent(
 *
 *         @OA\Property(property="weight_kg", type="number", format="float"),
 *         @OA\Property(property="record_date", type="string", format="date")
 *     )),
 *
 *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/WeightHistory"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateWeightController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Pet $pet, WeightHistory $weight)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'weight');

        if ($weight->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        $validatedData = $request->validate([
            'weight_kg' => 'sometimes|numeric|min:0',
            'record_date' => [
                'sometimes',
                'date',
            ],
        ]);

        if (array_key_exists('record_date', $validatedData)) {
            $exists = $pet->weightHistories()
                ->where('id', '!=', $weight->id)
                ->whereDate('record_date', $validatedData['record_date'])
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this pet.'],
                ]);
            }
        }

        $weight->update($validatedData);

        return $this->sendSuccess($weight);
    }
}
