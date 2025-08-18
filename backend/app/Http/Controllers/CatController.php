<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use App\Enums\CatStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\FosterAssignment;
use Illuminate\Support\Facades\Schema;

/**
 * @OA\Schema(
 *     schema="Cat",
 *     type="object",
 *     title="Cat",
 *     required={"id", "name", "breed", "birthday", "location", "description", "status", "user_id"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="breed", type="string", example="Siamese"),
 *     @OA\Property(property="birthday", type="string", format="date", example="2020-01-01"),
 *     @OA\Property(property="location", type="string", example="Hanoi"),
 *     @OA\Property(property="description", type="string", example="A friendly cat."),
 *     @OA\Property(property="status", type="string", example="active"),
 *     @OA\Property(property="user_id", type="integer", example=5)
 * )
 */
class CatController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Get(
     *     path="/api/my-cats",
     *     summary="Get the cats of the authenticated user",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's cats",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Cat")
     *         )
     *     ),
     *     @OA\Response(
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
     *     path="/api/my-cats/sections",
     *     summary="Get the cats of the authenticated user, organized by section",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's cats, organized by section",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="owned", type="array", @OA\Items(ref="#/components/schemas/Cat")),
     *             @OA\Property(property="fostering_active", type="array", @OA\Items(ref="#/components/schemas/Cat")),
     *             @OA\Property(property="fostering_past", type="array", @OA\Items(ref="#/components/schemas/Cat")),
     *             @OA\Property(property="transferred_away", type="array", @OA\Items(ref="#/components/schemas/Cat"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myCatsSections(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }

        // Owned (current owner)
        $owned = Cat::where('user_id', $user->id)->get();

        // Fostering active/past via assignments (guard if table not yet migrated in local/test envs)
        if (Schema::hasTable('foster_assignments')) {
            $activeFostering = \App\Models\FosterAssignment::where('foster_user_id', $user->id)
                ->where('status', 'active')
                ->with('cat')
                ->get()
                ->pluck('cat');

            $pastFostering = \App\Models\FosterAssignment::where('foster_user_id', $user->id)
                ->whereIn('status', ['completed', 'canceled'])
                ->with('cat')
                ->get()
                ->pluck('cat');
        } else {
            $activeFostering = collect();
            $pastFostering = collect();
        }

    // Transferred away: cats that the user used to own but no longer does
    // TODO: Replace with query based on ownership_history once wired in.
    $transferredAway = collect([]);

        return $this->sendSuccess([
            'owned' => $owned->values(),
            'fostering_active' => $activeFostering->values(),
            'fostering_past' => $pastFostering->values(),
            'transferred_away' => $transferredAway->values(),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/cats/{id}",
     *     summary="Get a specific cat",
     *     tags={"Cats"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="The cat",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Cat not found"
     *     )
     * )
     */
    public function show(Request $request, Cat $cat)
    {
        // Load placement requests and nested relations needed for the view
        $cat->load(['placementRequests.transferRequests.helperProfile.user']);

        // Centralize access via policy
        $this->authorize('view', $cat);

    $user = $request->user();
    $isOwner = $user && $cat->user_id === $user->id;
    $isAdmin = $user && method_exists($user, 'hasRole') ? $user->hasRole(['admin', 'super_admin']) : false;

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin,
            'can_view_contact' => $isAdmin || ($user && !$isOwner),
        ];
        $cat->setAttribute('viewer_permissions', $viewerPermissions);
        return $this->sendSuccess($cat);
    }

    /**
     * @OA\Get(
     *     path="/api/cats/featured",
     *     summary="Get a list of featured cats",
     *     tags={"Cats"},
     *     @OA\Response(
     *         response=200,
     *         description="A list of featured cats",
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
     * @OA\Get(
     *     path="/api/cats/placement-requests",
     *     summary="Get a list of cats with open placement requests",
     *     tags={"Cats"},
     *     @OA\Response(
     *         response=200,
     *         description="A list of cats with open placement requests",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Cat")
     *         )
     *     )
     * )
     */
    public function placementRequests(Request $request)
    {
        $cats = Cat::whereHas('placementRequests', function ($query) {
            $query->where('is_active', true)->where('status', \App\Enums\PlacementRequestStatus::OPEN->value);
        })->with('placementRequests')->get();

        return $this->sendSuccess($cats);
    }

    /**
     * @OA\Post(
     *     path="/api/cats",
     *     summary="Create a new cat",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Cat created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
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
     *     summary="Update a cat",
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
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Cat updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
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
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('update', $cat);

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
     *     summary="Delete a cat",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to delete",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"password"},
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Cat deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function destroy(Request $request, Cat $cat)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('delete', $cat);

        if (!Hash::check($request->input('password'), $user->password)) {
            return $this->sendError('The provided password does not match our records.', 422);
        }

        $cat->delete();

        return $this->sendSuccess(null, 204);
    }

    /**
     * @OA\Put(
     *     path="/api/cats/{id}/status",
     *     summary="Update a cat's status",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="ID of the cat to update", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"status", "password"},
     *             @OA\Property(property="status", type="string", enum=App\Enums\CatStatus::class, example="lost"),
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Cat status updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
     *     ),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation Error")
     * )
     */
    public function updateStatus(Request $request, Cat $cat)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('update', $cat);

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