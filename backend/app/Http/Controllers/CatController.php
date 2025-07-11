<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use App\Enums\UserRole;

/**
 * @OA\Schema(
 *     schema="Cat",
 *     title="Cat",
 *     description="Cat model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Cat ID"
 *     ),
 *     @OA\Property(
 *         property="name",
 *         type="string",
 *         description="Cat's name"
 *     ),
 *     @OA\Property(
 *         property="breed",
 *         type="string",
 *         description="Cat's breed"
 *     ),
 *     @OA\Property(
 *         property="age",
 *         type="integer",
 *         description="Cat's age in years"
 *     ),
 *     @OA\Property(
 *         property="location",
 *         type="string",
 *         description="Cat's location"
 *     ),
 *     @OA\Property(
 *         property="description",
 *         type="string",
 *         description="Cat's description"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of cat creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last cat update"
 *     )
 * )
 */
class CatController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/cats",
     *     summary="Get a list of all available cats",
     *     tags={"Cats"},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Cat")
     *         )
     *     )
     * )
     */
    public function index(Request $request)
    {
        $query = Cat::query();

        if ($request->has('location')) {
            $query->where('location', 'like', '%' . $request->input('location') . '%');
        }

        if ($request->has('breed')) {
            $query->where('breed', 'like', '%' . $request->input('breed') . '%');
        }

        if ($request->has('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortDirection = $request->input('sort_direction', 'asc'); // Default to ascending

            if (in_array($sortBy, ['name', 'age'])) {
                $query->orderBy($sortBy, $sortDirection);
            }
        }

        $cats = $query->get();
        return response()->json($cats);
    }

    /**
     * @OA\Get(
     *     path="/api/cats/{id}",
     *     summary="Get a single cat's profile with viewer permissions",
     *     tags={"Cats"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to retrieve",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             allOf={
     *                 @OA\Schema(ref="#/components/schemas/Cat"),
     *                 @OA\Schema(
     *                     @OA\Property(
     *                         property="viewer_permissions",
     *                         type="object",
     *                         description="Permissions for the current viewer",
     *                         @OA\Property(property="can_edit", type="boolean", example=true),
     *                         @OA\Property(property="can_view_contact", type="boolean", example=false)
     *                     )
     *                 )
     *             }
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Cat not found"
     *     )
     * )
     */
    public function show(Request $request, Cat $cat)
    {
        $viewerPermissions = [
            'can_edit' => false,
            'can_view_contact' => false,
        ];

        if ($request->user()) {
            $userRole = $request->user()->role;

            if ($userRole === UserRole::ADMIN->value) {
                $viewerPermissions['can_edit'] = true;
                $viewerPermissions['can_view_contact'] = true;
            } elseif ($userRole === UserRole::CAT_OWNER->value && $cat->user_id === $request->user()->id) {
                $viewerPermissions['can_edit'] = true;
            } elseif ($userRole === UserRole::HELPER->value) {
                $viewerPermissions['can_view_contact'] = true;
            }
        }

        $catData = $cat->toArray();
        $catData['viewer_permissions'] = $viewerPermissions;

        return response()->json($catData);
    }

    /**
     * @OA\Get(
     *     path="/api/cats/featured",
     *     summary="Get a list of featured cats for the homepage",
     *     tags={"Cats"},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Cat")
     *         )
     *     )
     * )
     */
    public function featured()
    {
        // For now, return a random selection of 3 cats as featured
        $featuredCats = Cat::inRandomOrder()->limit(3)->get();
        return response()->json($featuredCats);
    }

    /**
     * @OA\Post(
     *     path="/api/cats",
     *     summary="Create a new cat listing",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "breed", "age", "location", "description"},
     *             @OA\Property(property="name", type="string", example="Whiskers"),
     *             @OA\Property(property="breed", type="string", example="Siamese"),
     *             @OA\Property(property="age", type="integer", example=2),
     *             @OA\Property(property="location", type="string", example="New York, USA"),
     *             @OA\Property(property="description", type="string", example="A friendly and playful cat.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Cat created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"name": {"The name field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'name' => 'required|string|max:255',
                'breed' => 'required|string|max:255',
                'age' => 'required|integer|min:0',
                'location' => 'required|string|max:255',
                'description' => 'required|string',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $cat = Cat::create($validatedData + ['user_id' => $request->user()->id]);

        return response()->json($cat, 201);
    }

    /**
     * @OA\Put(
     *     path="/api/cats/{id}",
     *     summary="Update a cat's profile",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to update",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Whiskers Updated"),
     *             @OA\Property(property="breed", type="string", example="Siamese Mix"),
     *             @OA\Property(property="age", type="integer", example=3),
     *             @OA\Property(property="location", type="string", example="London, UK"),
     *             @OA\Property(property="description", type="string", example="A friendly and playful cat, now in London.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Cat updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Cat not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not authorized to update this cat."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function update(Request $request, Cat $cat)
    {
        if ($request->user()->role !== UserRole::ADMIN && $cat->user_id !== $request->user()->id) {
            return response()->json(['message' => 'You are not authorized to update this cat.'], 403);
        }

        try {
            $validatedData = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'breed' => 'sometimes|required|string|max:255',
                'age' => 'sometimes|required|integer|min:0',
                'location' => 'sometimes|required|string|max:255',
                'description' => 'sometimes|required|string',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $cat->fill($validatedData);
        $cat->save();

        return response()->json($cat);
    }
}
