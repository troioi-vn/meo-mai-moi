<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/my-pets",
 *     summary="Get the pets of the authenticated user",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of the user's pets",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(ref="#/components/schemas/Pet")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class ListMyPetsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request)
    {
        if (! $request->user()) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $query = Pet::where('user_id', $request->user()->id)->with('petType');

        if ($request->filled('pet_type')) {
            $slug = $request->query('pet_type');
            $query->whereHas('petType', function ($q) use ($slug) {
                $q->where('slug', $slug);
            });
        }

        $pets = $query->get();

        return $this->sendSuccess($pets);
    }
}
