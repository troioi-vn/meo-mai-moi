<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class ReviewController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/reviews",
     *     summary="Create a new review",
     *     tags={"Reviews"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"reviewed_id", "rating"},
     *             @OA\Property(property="reviewed_id", type="integer", example=2),
     *             @OA\Property(property="rating", type="integer", example=5),
     *             @OA\Property(property="comment", type="string", example="Great experience!")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Review created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Review")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"rating": {"The rating field is required."}})
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
                'reviewed_user_id' => 'required|exists:users,id',
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string',
                'transfer_id' => 'nullable|exists:transfer_requests,id',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $existingReview = Review::where('reviewer_user_id', $request->user()->id)
            ->where('reviewed_user_id', $validatedData['reviewed_user_id'])
            ->where('transfer_id', $validatedData['transfer_id'])
            ->first();

        if ($existingReview) {
            return response()->json(['message' => 'You have already reviewed this user for this transfer.'], 409);
        }

        $review = Review::create(array_merge($validatedData, ['reviewer_user_id' => $request->user()->id]));

        return response()->json($review, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/users/{id}/reviews",
     *     summary="Get reviews for a specific user",
     *     tags={"Reviews"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the user to retrieve reviews for",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Review")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="User not found"
     *     )
     * )
     */
    public function index(User $user)
    {
        $reviews = $user->reviewsBeingReviewed()->with('reviewer')->get();
        return response()->json($reviews);
    }
}
