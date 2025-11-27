<?php

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\WeightHistory;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Delete(
 *     path="/api/pets/{pet}/weights/{weight}",
 *     summary="Delete a weight record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="weight", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\Response(response=200, description="Deleted", @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found")
 * )
 */
class DeleteWeightController extends Controller
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

        $weight->delete();

        return response()->json(['data' => true]);
    }
}
