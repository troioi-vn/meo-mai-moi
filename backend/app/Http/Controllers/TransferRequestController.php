<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\TransferRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="TransferRequest",
 *     title="TransferRequest",
 *     description="Transfer Request model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Transfer Request ID"
 *     ),
 *     @OA\Property(
 *         property="cat_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the cat being transferred"
 *     ),
 *     @OA\Property(
 *         property="initiator_user_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user initiating the transfer"
 *     ),
 *     @OA\Property(
 *         property="recipient_user_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user intended to receive the cat"
 *     ),
 *     @OA\Property(
 *         property="status",
 *         type="string",
 *         enum={"pending", "accepted", "rejected"},
 *         description="Current status of the transfer request"
 *     ),
 *     @OA\Property(
 *         property="requested_relationship_type",
 *         type="string",
 *         enum={"fostering", "permanent_foster"},
 *         description="Type of custodianship requested"
 *     ),
 *     @OA\Property(
 *         property="accepted_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the request was accepted"
 *     ),
 *     @OA\Property(
 *         property="rejected_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the request was rejected"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of transfer request creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last transfer request update"
 *     )
 * )
 */
class TransferRequestController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/cats/{cat_id}/transfer-request",
     *     summary="Initiate a transfer request for a cat",
     *     tags={"Transfer Requests"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat_id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat for which to initiate a transfer",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"recipient_user_id", "requested_relationship_type"},
     *             @OA\Property(property="recipient_user_id", type="integer", example=2),
     *             @OA\Property(property="requested_relationship_type", type="string", enum={"fostering", "permanent_foster"}, example="fostering")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Transfer request created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/TransferRequest")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"recipient_user_id": {"The recipient user id field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the owner of this cat."
     *     )
     * )
     */
    public function store(Request $request, Cat $cat)
    {
        if ($cat->user_id !== $request->user()->id) {
            return response()->json(['message' => 'You are not the owner of this cat.'], 403);
        }

        try {
            $validatedData = $request->validate([
                'recipient_user_id' => 'required|exists:users,id',
                'requested_relationship_type' => 'required|in:fostering,permanent_foster',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $transferRequest = TransferRequest::create(array_merge($validatedData, [
            'cat_id' => $cat->id,
            'initiator_user_id' => $request->user()->id,
            'status' => 'pending',
        ]));

        return response()->json($transferRequest, 201);
    }

    /**
     * @OA\Post(
     *     path="/api/transfer-requests/{id}/accept",
     *     summary="Accept a transfer request",
     *     tags={"Transfer Requests"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the transfer request to accept",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transfer request accepted successfully",
     *         @OA\JsonContent(ref="#/components/schemas/TransferRequest")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Transfer request not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the recipient of this request or the request is not pending."
     *     )
     * )
     */
    public function accept(Request $request, TransferRequest $transferRequest)
    {
        if ($transferRequest->recipient_user_id !== $request->user()->id || $transferRequest->status !== 'pending') {
            return response()->json(['message' => 'You are not the recipient of this request or the request is not pending.'], 403);
        }

        $transferRequest->status = 'accepted';
        $transferRequest->accepted_at = now();
        $transferRequest->save();

        // Logic to update cat custodianship should go here

        return response()->json($transferRequest);
    }

    /**
     * @OA\Post(
     *     path="/api/transfer-requests/{id}/reject",
     *     summary="Reject a transfer request",
     *     tags={"Transfer Requests"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the transfer request to reject",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Transfer request rejected successfully",
     *         @OA\JsonContent(ref="#/components/schemas/TransferRequest")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Transfer request not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the recipient of this request or the request is not pending."
     *     )
     * )
     */
    public function reject(Request $request, TransferRequest $transferRequest)
    {
        if ($transferRequest->recipient_user_id !== $request->user()->id || $transferRequest->status !== 'pending') {
            return response()->json(['message' => 'You are not the recipient of this request or the request is not pending.'], 403);
        }

        $transferRequest->status = 'rejected';
        $transferRequest->rejected_at = now();
        $transferRequest->save();

        return response()->json($transferRequest);
    }
}
