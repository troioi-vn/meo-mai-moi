<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesErrors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Enum;

/**
 * @OA\Put(
 *     path="/api/pets/{id}/status",
 *     summary="Update a pet's status",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="ID of the pet to update", @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"status", "password"},
 *
 *             @OA\Property(property="status", type="string", enum=App\Enums\PetStatus::class, example="lost"),
 *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Pet status updated successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=422, description="Validation Error")
 * )
 */
class UpdatePetStatusController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesErrors;

    public function __invoke(Request $request, Pet $pet)
    {
        $user = $this->authorizeUser($request, 'update', $pet);

        $validated = $request->validate([
            'status' => ['required', 'string', new Enum(PetStatus::class)],
            'password' => 'required|string',
        ]);

        if (! Hash::check($validated['password'], $user->password)) {
            return $this->handleBusinessError('The provided password does not match our records.', 422);
        }

        $pet->status = $validated['status'];
        $pet->save();

        $pet->load('petType');

        return $this->sendSuccess($pet);
    }
}
