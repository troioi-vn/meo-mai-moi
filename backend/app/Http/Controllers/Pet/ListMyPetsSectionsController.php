<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Models\OwnershipHistory;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * @OA\Get(
 *     path="/api/my-pets/sections",
 *     summary="Get the pets of the authenticated user, organized by section",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of the user's pets, organized by section",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="owned", type="array", @OA\Items(ref="#/components/schemas/Pet")),
 *             @OA\Property(property="fostering_active", type="array", @OA\Items(ref="#/components/schemas/Pet")),
 *             @OA\Property(property="fostering_past", type="array", @OA\Items(ref="#/components/schemas/Pet")),
 *             @OA\Property(property="transferred_away", type="array", @OA\Items(ref="#/components/schemas/Pet"))
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class ListMyPetsSectionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request)
    {
        $user = $this->requireAuth($request);

        // Owned (current owner)
        $owned = Pet::where('user_id', $user->id)->with('petType')->get();

        // Fostering active/past via assignments (guard if table not yet migrated in local/test envs)
        if (Schema::hasTable('foster_assignments')) {
            $activeFostering = FosterAssignment::where('foster_user_id', $user->id)
                ->where('status', 'active')
                ->with(['pet.petType'])
                ->get()
                ->pluck('pet');

            $pastFostering = FosterAssignment::where('foster_user_id', $user->id)
                ->whereIn('status', ['completed', 'canceled'])
                ->with(['pet.petType'])
                ->get()
                ->pluck('pet');
        } else {
            $activeFostering = collect();
            $pastFostering = collect();
        }

        // Transferred away: pets that the user used to own but no longer does
        // Uses ownership_history if available
        if (Schema::hasTable('ownership_history')) {
            $transferredPetIds = OwnershipHistory::where('user_id', $user->id)
                ->whereNotNull('to_ts')
                ->pluck('pet_id')
                ->unique();

            $transferredAway = Pet::whereIn('id', $transferredPetIds)
                ->where('user_id', '!=', $user->id)
                ->with('petType')
                ->get();
        } else {
            $transferredAway = collect();
        }

        return $this->sendSuccess([
            'owned' => $owned->values(),
            'fostering_active' => $activeFostering->values(),
            'fostering_past' => $pastFostering->values(),
            'transferred_away' => $transferredAway->values(),
        ]);
    }
}
