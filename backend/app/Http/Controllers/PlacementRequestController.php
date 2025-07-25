<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Http\Resources\PlacementRequestResource;
use Illuminate\Http\Request;
use App\Traits\ApiResponseTrait;
use App\Enums\PlacementRequestType;
use App\Models\Cat;
use Illuminate\Support\Facades\Auth;

/**
 * @OA\Schema(
 *     schema="PlacementRequest",
 *     type="object",
 *     title="PlacementRequest",
 *     required={"id", "cat_id", "user_id", "request_type", "status"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="cat_id", type="integer", example=2),
 *     @OA\Property(property="user_id", type="integer", example=5),
 *     @OA\Property(property="request_type", type="string", example="adoption"),
 *     @OA\Property(property="status", type="string", example="pending"),
 *     @OA\Property(property="notes", type="string", example="Looking for a loving home."),
 *     @OA\Property(property="expires_at", type="string", format="date", example="2025-08-01")
 * )
 */
class PlacementRequestController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Post(
     *     path="/api/placement-requests",
     *     summary="Create a new placement request",
     *     tags={"Placement Requests"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"cat_id", "request_type"},
     *             @OA\Property(property="cat_id", type="integer", example=1),
     *             @OA\Property(property="request_type", type="string", enum=App\Enums\PlacementRequestType::class, example="permanent"),
     *             @OA\Property(property="notes", type="string", example="Looking for a loving home."),
     *             @OA\Property(property="expires_at", type="string", format="date", example="2025-12-31")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Placement request created successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", ref="#/components/schemas/PlacementRequest")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Conflict - Active placement request of this type already exists"
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
            'cat_id' => 'required|exists:cats,id',
            'request_type' => ['required', new \Illuminate\Validation\Rules\Enum(PlacementRequestType::class)],
            'notes' => 'nullable|string',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $cat = Cat::findOrFail($validatedData['cat_id']);

        if ($cat->user_id !== Auth::id()) {
            return $this->sendError('You are not authorized to create a placement request for this cat.', 403);
        }

        // Implement the business rule: One active placement request per type per cat.
        $existingRequest = PlacementRequest::where('cat_id', $cat->id)
            ->where('request_type', $validatedData['request_type'])
            ->whereIn('status', ['open', 'pending_review'])
            ->exists();

        if ($existingRequest) {
            return $this->sendError('An active placement request of this type already exists for this cat.', 409);
        }

        $placementRequest = PlacementRequest::create($validatedData + ['user_id' => Auth::id()]);

        return $this->sendSuccess(new PlacementRequestResource($placementRequest), 201);
    }
}