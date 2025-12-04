<?php

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/categories",
 *     summary="List categories for a pet type",
 *     tags={"Categories"},
 *
 *     @OA\Parameter(
 *         name="pet_type_id",
 *         in="query",
 *         required=true,
 *         description="The pet type ID to filter categories",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Parameter(
 *         name="search",
 *         in="query",
 *         required=false,
 *         description="Search term to filter categories by name",
 *
 *         @OA\Schema(type="string")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of categories",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(ref="#/components/schemas/Category")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error - pet_type_id required"
 *     )
 * )
 */
class ListCategoriesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $request->validate([
            'pet_type_id' => 'required|integer|exists:pet_types,id',
            'search' => 'nullable|string|max:50',
        ]);

        $query = Category::forPetType($request->pet_type_id)
            ->visibleTo($request->user())
            ->with('petType');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'ilike', "%{$search}%");
        }

        $categories = $query->orderBy('name')->get();

        return $this->sendSuccess($categories);
    }
}
