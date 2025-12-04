<?php

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @OA\Post(
 *     path="/api/categories",
 *     summary="Create a new category",
 *     tags={"Categories"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"name", "pet_type_id"},
 *
 *             @OA\Property(property="name", type="string", maxLength=50, example="Siamese"),
 *             @OA\Property(property="pet_type_id", type="integer", example=1),
 *             @OA\Property(property="description", type="string", nullable=true, example="Elegant cats with blue eyes")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Category created successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/Category")
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="Category",
 *     type="object",
 *     title="Category",
 *     required={"id", "name", "slug", "pet_type_id"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Siamese"),
 *     @OA\Property(property="slug", type="string", example="siamese"),
 *     @OA\Property(property="pet_type_id", type="integer", example=1),
 *     @OA\Property(property="description", type="string", nullable=true, example="Elegant cats with blue eyes"),
 *     @OA\Property(property="created_by", type="integer", nullable=true, example=5),
 *     @OA\Property(property="approved_at", type="string", format="datetime", nullable=true),
 *     @OA\Property(property="usage_count", type="integer", example=10),
 *     @OA\Property(property="created_at", type="string", format="datetime"),
 *     @OA\Property(property="updated_at", type="string", format="datetime")
 * )
 */
class StoreCategoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
            ],
            'pet_type_id' => 'required|integer|exists:pet_types,id',
            'description' => 'nullable|string|max:500',
        ]);

        // Generate slug and check uniqueness
        $slug = Str::slug($validated['name']);

        // Check for unique name + pet_type_id combination
        $existingByName = Category::where('name', $validated['name'])
            ->where('pet_type_id', $validated['pet_type_id'])
            ->first();

        if ($existingByName) {
            return $this->sendError('A category with this name already exists for this pet type.', 422);
        }

        // Check for unique slug + pet_type_id combination
        $existingBySlug = Category::where('slug', $slug)
            ->where('pet_type_id', $validated['pet_type_id'])
            ->first();

        if ($existingBySlug) {
            // Generate unique slug by appending a number
            $counter = 1;
            $originalSlug = $slug;
            while ($existingBySlug) {
                $slug = $originalSlug.'-'.$counter;
                $existingBySlug = Category::where('slug', $slug)
                    ->where('pet_type_id', $validated['pet_type_id'])
                    ->first();
                $counter++;
            }
        }

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'pet_type_id' => $validated['pet_type_id'],
            'description' => $validated['description'] ?? null,
            'created_by' => $request->user()->id,
            'approved_at' => null, // User-created categories need approval
        ]);

        $category->load('petType');

        return $this->sendSuccess($category, 201);
    }
}
