<?php

namespace App\Http\Controllers\TransferHandover;

use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Models\Notification;
use App\Models\OwnershipHistory;
use App\Models\Pet;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * @OA\Post(
 *   path="/api/transfer-handovers/{id}/complete",
 *   summary="Complete handover and finalize transfer effects",
 *   tags={"Transfer Handover"},
 *   security={{"sanctum": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
 * )
 */
class CompleteHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {
    }

    public function __invoke(Request $request, TransferHandover $handover)
    {
        // Either party can mark completion when meeting occurred
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->helper_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (! in_array($handover->status, ['confirmed', 'pending'])) {
            return $this->sendError('Handover is not in a completable state.', 409);
        }

        $tr = $handover->transferRequest()->with(['pet', 'placementRequest'])->first();

        DB::transaction(function () use ($handover, $tr) {
            $handover->status = 'completed';
            $handover->completed_at = now();
            $handover->save();

            // Set placement request to pending_transfer first
            $placementRequest = $tr->placementRequest;
            if ($placementRequest) {
                $placementRequest->status = PlacementRequestStatus::PENDING_TRANSFER;
                $placementRequest->save();
            }

            // Finalize transfer effects depending on relationship type
            $type = $tr->requested_relationship_type;
            if ($type === 'permanent_foster') {
                // Close previous ownership record for current owner; backfill if missing
                $closed = OwnershipHistory::where('pet_id', $tr->pet_id)
                    ->where('user_id', $tr->recipient_user_id)
                    ->whereNull('to_ts')
                    ->update(['to_ts' => now()]);

                if ($closed === 0) {
                    // No open record to close; create a backfilled one starting from earliest known timestamp
                    $from = optional($tr->pet)->created_at ?? (optional($tr->placementRequest)->created_at ?? now());
                    OwnershipHistory::create([
                        'pet_id' => $tr->pet_id,
                        'user_id' => $tr->recipient_user_id,
                        'from_ts' => $from,
                        'to_ts' => now(),
                    ]);
                }

                // Assign new owner
                optional($tr->pet)->update(['user_id' => $tr->initiator_user_id]);

                // Create new ownership history for new owner
                OwnershipHistory::create([
                    'pet_id' => $tr->pet_id,
                    'user_id' => $tr->initiator_user_id,
                    'from_ts' => now(),
                    'to_ts' => null,
                ]);

                // For permanent rehoming, set status to finalized
                if ($placementRequest) {
                    $placementRequest->status = PlacementRequestStatus::FINALIZED;
                    $placementRequest->save();
                }
            } elseif ($type === 'fostering' && Schema::hasTable('foster_assignments')) {
                FosterAssignment::firstOrCreate([
                    'pet_id' => $tr->pet_id,
                    'owner_user_id' => $tr->recipient_user_id,
                    'foster_user_id' => $tr->initiator_user_id,
                    'transfer_request_id' => $tr->id,
                ], [
                    'start_date' => now()->toDateString(),
                    'expected_end_date' => optional($tr->placementRequest)->end_date,
                    'status' => 'active',
                ]);

                // For temporary fostering, set status to active
                if ($placementRequest) {
                    $placementRequest->status = PlacementRequestStatus::ACTIVE;
                    $placementRequest->save();
                }
            }

            // Auto-reject other pending transfer requests for the same placement
            // now that the pet transfer is complete
            if ($placementRequest) {
                $this->rejectOtherPendingRequests($placementRequest->id, $tr->id);
            }
        });
        // Notify both parties of completion
        Notification::insert([
            [
                'user_id' => $handover->owner_user_id,
                'message' => 'Handover completed.',
                'link' => '/account/handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->helper_user_id,
                'message' => 'Handover completed.',
                'link' => '/account/handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        return $this->sendSuccess($handover->fresh());
    }

    /**
     * Auto-reject all other pending transfer requests for the same placement request.
     * This is called when the handover is completed and the pet transfer is finalized.
     */
    private function rejectOtherPendingRequests(int $placementRequestId, int $acceptedTransferRequestId): void
    {
        $rejectedRequests = TransferRequest::where('placement_request_id', $placementRequestId)
            ->where('id', '!=', $acceptedTransferRequestId)
            ->where('status', TransferRequestStatus::PENDING)
            ->get();

        foreach ($rejectedRequests as $rejectedRequest) {
            $rejectedRequest->update(['status' => TransferRequestStatus::REJECTED, 'rejected_at' => now()]);

            // Notify rejected helper
            try {
                $rejectedHelper = User::find($rejectedRequest->initiator_user_id);
                $pet = $rejectedRequest->pet ?: Pet::find($rejectedRequest->pet_id);
                if ($rejectedHelper && $pet) {
                    $this->notificationService->send(
                        $rejectedHelper,
                        NotificationType::HELPER_RESPONSE_REJECTED->value,
                        [
                            'message' => 'Your request for '.$pet->name.' was not selected. The owner chose another helper.',
                            'link' => '/pets/'.$pet->id,
                            'pet_name' => $pet->name,
                            'pet_id' => $pet->id,
                            'transfer_request_id' => $rejectedRequest->id,
                        ]
                    );
                }
            } catch (\Throwable $e) {
                // non-fatal; log at debug level for auditability
                Log::debug('Failed to notify rejected helper', [
                    'transfer_request_id' => $rejectedRequest->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
