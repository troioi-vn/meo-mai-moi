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


    public function myCats(Request $request)
    {
        if (!$request->user()) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $cats = $request->user()->cats;
        return $this->sendSuccess($cats);
    }
    public function show(Request $request, Cat $cat)
    {
        $cat->load('placementRequests');

        $user = $request->user();
        $isOwner = $user && $cat->user_id === $user->id;
        $userRole = $user ? $user->role : null;
        $isAdmin = $userRole === UserRole::ADMIN || $userRole === UserRole::ADMIN->value;

        if (!$user || (!$isOwner && !$isAdmin)) {
            return $this->sendError('Forbidden: You are not authorized to view this cat.', 403);
        }

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin,
            'can_view_contact' => $isAdmin,
        ];
        $cat->setAttribute('viewer_permissions', $viewerPermissions);
        return $this->sendSuccess($cat);
    }

    public function featured()
    {
        // For now, return a random selection of 3 cats as featured (excluding dead cats)
        $featuredCats = Cat::whereNotIn('status', [CatStatus::DECEASED, CatStatus::DELETED])->inRandomOrder()->limit(3)->get();
        return $this->sendSuccess($featuredCats);
    }

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
