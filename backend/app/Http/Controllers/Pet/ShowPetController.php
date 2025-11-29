<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{id}",
 *     summary="Get a specific pet",
 *     tags={"Pets"},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the pet",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="The pet",
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Pet not found"
 *     )
 * )
 */
class ShowPetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet)
    {
        // Load placement requests and nested relations needed for the view
        $pet->load(['placementRequests.transferRequests.helperProfile.user', 'petType']);

        // Resolve user and authorize access
        $user = $this->authorizeUser($request, 'view', $pet);
        $isOwner = $this->isOwnerOrAdmin($user, $pet);
        $isAdmin = $this->hasRole($user, ['admin', 'super_admin']);

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin,
            'can_view_contact' => $isAdmin || ($user && ! $isOwner),
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }
}
