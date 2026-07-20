<?php

declare(strict_types=1);

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/categories',
    summary: 'Create a new category',
    tags: ['Categories'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'pet_type_id'],
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 50, example: 'Siamese'),
                new OA\Property(property: 'pet_type_id', type: 'integer', example: 1),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Elegant cats with blue eyes'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Category created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/CategoryResponse')
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
        new OA\Response(response: 409, description: 'Duplicate category candidate'),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class StoreCategoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse
    {
        // No policy gate here — category creation is open to all authenticated users.
        // CategoryPolicy governs the Filament admin panel via Shield.
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
            ],
            'pet_type_id' => 'required|integer|exists:pet_types,id',
            'description' => 'nullable|string|max:500',
        ]);
        $user = $request->user();

        return DB::transaction(function () use ($user, $validated): JsonResponse {
            $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Generate slug and check uniqueness
            $slug = Str::slug($validated['name']);

            // Check for unique name + pet_type_id combination (check against current locale)
            $locale = app()->getLocale();
            $existingByName = Category::whereJsonContainsLocale('name', $locale, $validated['name'])
                ->where('pet_type_id', $validated['pet_type_id'])
                ->first();

            if ($existingByName) {
                $accessToken = $user->currentAccessToken();
                if ($accessToken instanceof PersonalAccessToken && $accessToken->can('pet:write')) {
                    return response()->json([
                        'success' => false,
                        'data' => [
                            'code' => 'duplicate_candidate',
                            'existing_category_ids' => [(int) $existingByName->id],
                        ],
                        'message' => __('messages.category.already_exists'),
                        'error' => 'duplicate_category',
                    ], 409);
                }

                return $this->sendError(__('messages.category.already_exists'), 422);
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
                'created_by' => $user->id,
                'approved_at' => null, // User-created categories need approval
            ]);

            $category->load('petType');

            return $this->sendSuccess($category, 201);
        });
    }
}
