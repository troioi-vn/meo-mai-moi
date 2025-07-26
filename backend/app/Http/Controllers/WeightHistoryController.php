<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\WeightHistory;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="WeightHistory",
 *     title="WeightHistory",
 *     description="Weight History model",
 *     @OA\Property(property="id", type="integer", format="int64", description="Weight History ID"),
 *     @OA\Property(property="cat_id", type="integer", format="int64", description="ID of the associated cat"),
 *     @OA\Property(property="weight_kg", type="number", format="float", description="Recorded weight in kilograms"),
 *     @OA\Property(property="record_date", type="string", format="date", description="Date the weight was recorded"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of weight record creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last weight record update")
 * )
 */
class WeightHistoryController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Post(
     *     path="/api/cats/{cat_id}/weight-history",
     *     summary="Add a new weight record for a cat",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat_id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to add a weight record for",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"weight_kg", "record_date"},
     *             @OA\Property(property="weight_kg", type="number", format="float", example=5.2),
     *             @OA\Property(property="record_date", type="string", format="date", example="2024-01-15")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Weight record created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/WeightHistory")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"weight_kg": {"The weight kg field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not authorized to add weight records for this cat."
     *     )
     * )
     */
    public function store(Request $request, Cat $cat)
    {
        // Assuming only the cat's owner or an admin can add weight records
        if ($request->user()->id !== $cat->user_id && $request->user()->role !== \App\Enums\UserRole::ADMIN) {
            return $this->sendError('You are not authorized to add weight records for this cat.', 403);
        }

        $validatedData = $request->validate([
            'weight_kg' => 'required|numeric|min:0',
            'record_date' => 'required|date',
        ]);

        $weightHistory = $cat->weightHistories()->create($validatedData);

        return $this->sendSuccess($weightHistory, 201);
    }
}
