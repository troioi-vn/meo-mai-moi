<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use App\Enums\UserRole;

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
 *         property="fostering_type",
 *         type="string",
 *         enum={"free", "paid"},
 *         nullable=true,
 *         description="Type of fostering (free or paid)"
 *     ),
 *     @OA\Property(
 *         property="price",
 *         type="number",
 *         format="float",
 *         nullable=true,
 *         description="Price for paid fostering"
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
    use ApiResponseTrait;

    /**
     * @OA\Post(
     *     path="/api/transfer-requests",
     *     summary="Initiate a transfer request for a cat (by a helper)",
     *     tags={"Transfer Requests"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"cat_id", "requested_relationship_type"},
     *             @OA\Property(property="cat_id", type="integer", example=1),
     *             @OA\Property(property="requested_relationship_type", type="string", enum={"fostering", "permanent_foster"}, example="fostering"),
     *             @OA\Property(property="fostering_type", type="string", enum={"free", "paid"}, nullable=true, example="free"),
     *             @OA\Property(property="price", type="number", format="float", nullable=true, example=50.00)
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
     *             @OA\Property(property="errors", type="object", example={"cat_id": {"The cat id field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: Only helpers can initiate transfer requests or cat is not available."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Cat not found"
     *     )
     * )
     */
    public function store(Request $request)
    {
        $this->authorize('create', TransferRequest::class);
        $user = $request->user();

        $validatedData = $request->validate([
            'cat_id' => 'required|exists:cats,id',
            'placement_request_id' => 'required|exists:placement_requests,id',
            'helper_profile_id' => 'required|exists:helper_profiles,id',
            'requested_relationship_type' => 'required|in:fostering,permanent_foster',
            'fostering_type' => 'nullable|in:free,paid|required_if:requested_relationship_type,fostering',
            'price' => 'nullable|numeric|min:0|required_if:fostering_type,paid',
        ]);

        $cat = Cat::find($validatedData['cat_id']);

        if (!$cat) {
            return $this->sendError('Cat not found.', 404);
        }

        if ($cat->user_id === $user->id) {
            return $this->sendError('You cannot create a transfer request for your own cat.', 403);
        }

        if ($cat->status !== \App\Enums\CatStatus::ACTIVE) {
            return $this->sendError('Cat is not available for transfer.', 403);
        }

                $transferRequest = TransferRequest::create(array_merge($validatedData, [
            'initiator_user_id' => $user->id,
            'recipient_user_id' => $cat->user_id, // Cat owner is the recipient
            'requester_id' => $user->id, // User making the request
            'status' => 'pending',
        ]));

        // Send notification to cat owner
        \App\Models\Notification::create([
            'user_id' => $cat->user_id,
            'message' => 'New transfer request for your cat: ' . $cat->name,
            'link' => '/account/transfer-requests/' . $transferRequest->id,
            'is_read' => false,
        ]);

        return $this->sendSuccess($transferRequest, 201);
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
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/TransferRequest")
     *         )
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
        $this->authorize('accept', $transferRequest);

        $transferRequest->status = 'accepted';
        $transferRequest->accepted_at = now();
        $transferRequest->save();

        $transferRequest->cat->update(['user_id' => $transferRequest->recipient_user_id]);

        if ($transferRequest->placementRequest) {
            $transferRequest->placementRequest->update(['is_active' => false]);
        }

        return $this->sendSuccess($transferRequest);
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
        $this->authorize('reject', $transferRequest);

        $transferRequest->status = 'rejected';
        $transferRequest->rejected_at = now();
        $transferRequest->save();

        return $this->sendSuccess($transferRequest);
    }
}
