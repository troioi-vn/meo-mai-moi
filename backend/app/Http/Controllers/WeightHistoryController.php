<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\WeightHistory;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class WeightHistoryController extends Controller
{
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
     *         @OA\JsonContent(ref="#/components/schemas/WeightHistory")
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
        if ($request->user()->id !== $cat->user_id && $request->user()->role !== \App\Enums\UserRole::ADMIN->value) {
            return response()->json(['message' => 'You are not authorized to add weight records for this cat.'], 403);
        }

        try {
            $validatedData = $request->validate([
                'weight_kg' => 'required|numeric|min:0',
                'record_date' => 'required|date',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $weightHistory = $cat->weightHistories()->create($validatedData);

        return response()->json($weightHistory, 201);
    }
}
