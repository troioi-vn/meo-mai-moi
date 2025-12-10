<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/pets/{id}/public",
 *     summary="Get public profile of a specific pet",
 *     description="Returns whitelisted fields for public view. Only accessible for pets that are lost or have active placement requests.",
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
 *         description="The pet public profile",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="id", type="integer"),
 *             @OA\Property(property="name", type="string"),
 *             @OA\Property(property="sex", type="string"),
 *             @OA\Property(property="birthday_precision", type="string"),
 *             @OA\Property(property="birthday_year", type="integer", nullable=true),
 *             @OA\Property(property="birthday_month", type="integer", nullable=true),
 *             @OA\Property(property="birthday_day", type="integer", nullable=true),
 *             @OA\Property(property="country", type="string"),
 *             @OA\Property(property="state", type="string", nullable=true),
 *             @OA\Property(property="city", type="string", nullable=true),
 *             @OA\Property(property="description", type="string"),
 *             @OA\Property(property="status", type="string"),
 *             @OA\Property(property="pet_type_id", type="integer"),
 *             @OA\Property(property="photo_url", type="string", nullable=true),
 *             @OA\Property(property="photos", type="array", @OA\Items(type="object")),
 *             @OA\Property(property="pet_type", type="object"),
 *             @OA\Property(property="categories", type="array", @OA\Items(type="object")),
 *             @OA\Property(property="placement_requests", type="array", @OA\Items(type="object")),
 *             @OA\Property(
 *                 property="viewer_permissions",
 *                 type="object",
 *                 @OA\Property(property="is_owner", type="boolean")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Pet is not publicly viewable"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Pet not found"
 *     )
 * )
 */
class ShowPublicPetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    /**
     * Whitelisted fields for public view.
     */
    private const PUBLIC_FIELDS = [
        'id',
        'name',
        'sex',
        'birthday_precision',
        'birthday_year',
        'birthday_month',
        'birthday_day',
        'country',
        'state',
        'city',
        'city_id',
        'description',
        'status',
        'pet_type_id',
        'photo_url',
        'photos',
        'created_at',
        'updated_at',
    ];

    public function __invoke(Request $request, Pet $pet)
    {
        try {
            // Check if pet is publicly viewable using the policy
            $this->authorize('view', $pet);
        } catch (AuthorizationException $exception) {
            return $this->sendError('This pet profile is not publicly available.', 403);
        }

        // Load relations needed for public view
        $pet->load(['placementRequests.transferRequests.helperProfile.user', 'petType', 'categories', 'city']);

        // Resolve user to determine if viewer is owner
        $user = $this->resolveUser($request);
        $isOwner = $user && $pet->user_id === $user->id;

        // Build public response with whitelisted fields
        $publicData = $pet->only(self::PUBLIC_FIELDS);

        // Add relations
        $publicData['pet_type'] = $pet->petType;
        $publicData['categories'] = $pet->categories;
        $publicData['placement_requests'] = $pet->placementRequests;

        // Add viewer permissions
        $publicData['viewer_permissions'] = [
            'is_owner' => $isOwner,
        ];

        return $this->sendSuccess($publicData);
    }
}
