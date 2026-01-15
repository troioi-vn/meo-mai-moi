<?php

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: "/api/categories",
    summary: "List categories for a pet type",
    tags: ["Categories"],
    parameters: [
        new OA\Parameter(
            name: "pet_type_id",
            in: "query",
            required: true,
            description: "The pet type ID to filter categories",
            schema: new OA\Schema(type: "integer")
        ),
        new OA\Parameter(
            name: "search",
            in: "query",
            required: false,
            description: "Search term to filter categories by name",
            schema: new OA\Schema(type: "string")
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: "A list of categories",
            content: new OA\JsonContent(
                type: "array",
                items: new OA\Items(ref: "#/components/schemas/Category")
            )
        ),
        new OA\Response(
            response: 422,
            description: "Validation error - pet_type_id required"
        ),
    ]
)]
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
