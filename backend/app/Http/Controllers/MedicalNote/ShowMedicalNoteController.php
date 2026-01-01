<?php

namespace App\Http\Controllers\MedicalNote;

use App\Http\Controllers\Controller;
use App\Models\MedicalNote;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{pet}/medical-notes/{note}",
 *     summary="Get a single medical note",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="note", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalNote"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found")
 * )
 */
class ShowMedicalNoteController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Pet $pet, MedicalNote $note)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $pet->isOwnedBy($user);
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'medical');

        if ($note->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        return $this->sendSuccess($note);
    }
}
