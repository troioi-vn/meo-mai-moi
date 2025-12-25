<?php

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/transfer-requests",
 *     summary="Initiate a transfer request for a pet (by a helper)",
 *     tags={"Transfer Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"pet_id", "requested_relationship_type"},
 *
 *             @OA\Property(property="pet_id", type="integer", example=1),
 *             @OA\Property(property="requested_relationship_type", type="string", enum={"fostering", "permanent_foster"}, example="fostering"),
 *             @OA\Property(property="fostering_type", type="string", enum={"free", "paid"}, nullable=true, example="free"),
 *             @OA\Property(property="price", type="number", format="float", nullable=true, example=50.00)
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Transfer request created successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/TransferRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Validation Error"),
 *             @OA\Property(property="errors", type="object", example={"pet_id": {"The pet id field is required."}})
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden: Only helpers can initiate transfer requests or pet is not available."
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Pet not found"
 *     )
 * )
 */
class StoreTransferRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {
    }

    public function __invoke(Request $request)
    {
        $this->authorize('create', TransferRequest::class);
        $user = $request->user();

        $validatedData = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'placement_request_id' => 'required|exists:placement_requests,id',
            'helper_profile_id' => 'required|exists:helper_profiles,id',
            'requested_relationship_type' => 'required|in:fostering,permanent_foster',
            'fostering_type' => 'nullable|in:free,paid|required_if:requested_relationship_type,fostering',
            'price' => 'nullable|numeric|min:0|required_if:fostering_type,paid',
        ]);
        $pet = Pet::find($validatedData['pet_id']);

        if (! $pet) {
            return $this->sendError('Pet not found.', 404);
        }

        /** @var \App\Models\Pet $pet */
        if ($pet->user_id === $user->id) {
            return $this->sendError('You cannot create a transfer request for your own pet.', 403);
        }

        if ($pet->status !== \App\Enums\PetStatus::ACTIVE) {
            return $this->sendError('Pet is not available for transfer.', 403);
        }

        // Prevent duplicate pending responses from the same user for the same placement request
        $alreadyPending = TransferRequest::where('placement_request_id', $validatedData['placement_request_id'])
            ->where('initiator_user_id', $user->id)
            ->where('status', TransferRequestStatus::PENDING)
            ->exists();

        if ($alreadyPending) {
            return $this->sendError('You have already responded to this placement request and it is pending.', 409);
        }

        $transferRequest = TransferRequest::create(array_merge($validatedData, [
            'pet_id' => $pet->id,
            'initiator_user_id' => $user->id,
            'recipient_user_id' => $pet->user_id, // Pet owner is the recipient
            'requester_id' => $user->id, // User making the request
            'status' => TransferRequestStatus::PENDING,
        ]));

        // Send notification to pet owner using NotificationService
        $petOwner = User::find($pet->user_id);
        if ($petOwner) {
            $this->notificationService->send(
                $petOwner,
                NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                [
                    'message' => $user->name.' responded to your placement request for '.$pet->name,
                    'link' => '/pets/'.$pet->id,
                    'helper_name' => $user->name,
                    'pet_name' => $pet->name,
                    'pet_id' => $pet->id,
                    'transfer_request_id' => $transferRequest->id,
                ]
            );
        }

        return $this->sendSuccess($transferRequest, 201);
    }
}
