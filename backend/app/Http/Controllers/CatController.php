<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use App\Enums\UserRole;
use App\Enums\CatStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

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
 *         property="birthday",
 *         type="string",
 *         format="date",
 *         description="Cat's date of birth"
 *     ),
 *     @OA\Property(
 *         property="status",
 *         type="string",
 *         enum=App\Enums\CatStatus::class,
 *         description="Current status of the cat"
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
    use ApiResponseTrait;

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
        $query = Cat::query()->whereNotIn('status', [CatStatus::DECEASED, CatStatus::DELETED]);

        if ($request->has('location')) {
            $query->where('location', 'like', '%' . $request->input('location') . '%');
        }

        if ($request->has('breed')) {
            $query->where('breed', 'like', '%' . $request->input('breed') . '%');
        }

        if ($request->has('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortDirection = $request->input('sort_direction', 'asc'); // Default to ascending

            if (in_array($sortBy, ['name', 'birthday'])) {
                $query->orderBy($sortBy, $sortDirection);
            }
        }

        $cats = $query->get();
        return $this->sendSuccess($cats);
    }

    /**
     * @OA\Get(
     *     path="/api/my-cats",
     *     summary="Get a list of the authenticated user's cats",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Cat")
     *         )
     *     ),
     *      @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myCats(Request $request)
    {
        if (!$request->user()) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $cats = $request->user()->cats;
        return $this->sendSuccess($cats);
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
            $user = $request->user();
            $userRole = $user->role;

            $isAdmin = $userRole === UserRole::ADMIN || $userRole === UserRole::ADMIN->value;
            $isOwner = $cat->user_id === $user->id;
            $isHelper = $userRole === UserRole::HELPER || $userRole === UserRole::HELPER->value;

            if ($isAdmin) {
                $viewerPermissions['can_edit'] = true;
                $viewerPermissions['can_view_contact'] = true;
            } elseif ($isOwner) {
                $viewerPermissions['can_edit'] = true;
                if ($isHelper) {
                    $viewerPermissions['can_view_contact'] = true;
                }
            } elseif ($isHelper) {
                $viewerPermissions['can_view_contact'] = true;
            }
        }

        $cat->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($cat);
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
        // For now, return a random selection of 3 cats as featured (excluding dead cats)
        $featuredCats = Cat::whereNotIn('status', [CatStatus::DECEASED, CatStatus::DELETED])->inRandomOrder()->limit(3)->get();
        return $this->sendSuccess($featuredCats);
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
     *             required={"name", "breed", "birthday", "location", "description"},
     *             @OA\Property(property="name", type="string", example="Whiskers"),
     *             @OA\Property(property="breed", type="string", example="Siamese"),
     *             @OA\Property(property="birthday", type="string", format="date", example="2023-01-01"),
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
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'breed' => 'required|string|max:255',
            'birthday' => 'required|date',
            'location' => 'required|string|max:255',
            'description' => 'required|string',
        ]);

        $cat = Cat::create($validatedData + ['user_id' => $request->user()->id]);

        return $this->sendSuccess($cat, 201);
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
     *             @OA\Property(property="birthday", type="string", format="date", example="2023-01-01"),
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
        $user = $request->user();
        $role = $user ? ($user->role instanceof \BackedEnum ? $user->role->value : $user->role) : null;
        $isAdmin = $role === UserRole::ADMIN->value || $role === 'admin';
        $isOwner = $user && $cat->user_id === $user->id;
        if (!$user || (!$isAdmin && !$isOwner)) {
            return $this->sendError('Forbidden: You are not authorized to update this cat.', 403);
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'breed' => 'sometimes|required|string|max:255',
            'birthday' => 'sometimes|required|date',
            'location' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
        ]);

        $cat->fill($validatedData);
        $cat->save();

        return $this->sendSuccess($cat);
    }

    /**
     * @OA\Delete(
     *     path="/api/cats/{id}",
     *     summary="Delete a cat's profile",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to delete",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Cat deleted successfully"
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
     *         description="Forbidden: You are not authorized to delete this cat."
     *     )
     * )
     */
    public function destroy(Request $request, Cat $cat)
    {
        $user = $request->user();
        $role = $user ? ($user->role instanceof \BackedEnum ? $user->role->value : $user->role) : null;
        $isAdmin = $role === UserRole::ADMIN->value || $role === 'admin';
        $isOwner = $user && $cat->user_id === $user->id;

        if (!$user || (!$isAdmin && !$isOwner)) {
            return $this->sendError('Forbidden: You are not authorized to delete this cat.', 403);
        }

        if (!Hash::check($request->input('password'), $user->password)) {
            return $this->sendError('The provided password does not match our records.', 422);
        }

        $cat->delete();

        return $this->sendSuccess(null, 204);
    }

    public function updateStatus(Request $request, Cat $cat)
    {
        $user = $request->user();
        $role = $user ? ($user->role instanceof \BackedEnum ? $user->role->value : $user->role) : null;
        $isAdmin = $role === UserRole::ADMIN->value || $role === 'admin';
        $isOwner = $user && $cat->user_id === $user->id;

        if (!$user || (!$isAdmin && !$isOwner)) {
            return $this->sendError('Forbidden: You are not authorized to update this cat.', 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', new \Illuminate\Validation\Rules\Enum(CatStatus::class)],
            'password' => 'required|string',
        ]);

        if (!Hash::check($validated['password'], $user->password)) {
            return $this->sendError('The provided password does not match our records.', 422);
        }

        $cat->status = $validated['status'];
        $cat->save();

        return $this->sendSuccess($cat);
    }

    
}
