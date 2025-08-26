<?php

namespace App\Http\Controllers;

use App\Models\TransferHandover;
use App\Models\OwnershipHistory;
use App\Models\Notification;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use OpenApi\Annotations as OA;

class TransferHandoverController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Schema(
     *   schema="TransferHandover",
     *   title="TransferHandover",
     *   @OA\Property(property="id", type="integer"),
     *   @OA\Property(property="transfer_request_id", type="integer"),
     *   @OA\Property(property="owner_user_id", type="integer"),
     *   @OA\Property(property="helper_user_id", type="integer"),
     *   @OA\Property(property="scheduled_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="location", type="string", nullable=true),
     *   @OA\Property(property="status", type="string", enum={"pending","confirmed","completed","canceled","disputed"}),
     *   @OA\Property(property="owner_initiated_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="helper_confirmed_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="condition_confirmed", type="boolean"),
     *   @OA\Property(property="condition_notes", type="string", nullable=true),
     *   @OA\Property(property="completed_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="canceled_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="created_at", type="string", format="date-time"),
     *   @OA\Property(property="updated_at", type="string", format="date-time")
     * )
     */

    /**
     * @OA\Post(
     *   path="/api/transfer-requests/{id}/handover",
     *   summary="Initiate a handover for an accepted transfer request (owner only)",
     *   tags={"Transfer Handover"},
     *   security={{"sanctum": {}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(
     *     @OA\JsonContent(
     *       @OA\Property(property="scheduled_at", type="string", format="date-time", nullable=true),
     *       @OA\Property(property="location", type="string", nullable=true)
     *     )
     *   ),
     *   @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
     * )
     */
    public function store(Request $request, TransferRequest $transferRequest)
    {
        $user = $request->user();
        $this->authorize('accept', $transferRequest); // owner initiates handover for an accepted request

        if ($transferRequest->status !== 'accepted') {
            return $this->sendError('Handover can only be initiated for accepted requests.', 409);
        }

        $data = $request->validate([
            'scheduled_at' => 'nullable|date',
            'location' => 'nullable|string|max:255',
        ]);

        // Prefer updating the initial pending handover created at acceptance, if it exists
        $handover = TransferHandover::where('transfer_request_id', $transferRequest->id)
            ->where('status', 'pending')
            ->orderBy('id')
            ->first();

        if ($handover) {
            $handover->scheduled_at = $data['scheduled_at'] ?? $handover->scheduled_at;
            $handover->location = $data['location'] ?? $handover->location;
            if (!$handover->owner_initiated_at) {
                $handover->owner_initiated_at = now();
            }
            $handover->save();
        } else {
            $handover = TransferHandover::create([
                'transfer_request_id' => $transferRequest->id,
                'owner_user_id' => $transferRequest->recipient_user_id,
                'helper_user_id' => $transferRequest->initiator_user_id,
                'scheduled_at' => $data['scheduled_at'] ?? null,
                'location' => $data['location'] ?? null,
                'status' => 'pending',
                'owner_initiated_at' => now(),
            ]);
        }
        // Notify helper about scheduled handover
        Notification::create([
            'user_id' => $handover->helper_user_id,
            'message' => 'Handover scheduled for your accepted transfer. Please confirm details.',
            'link' => '/account/handovers/' . $handover->id,
            'is_read' => false,
        ]);
        return $this->sendSuccess($handover, 201);
    }

    /**
     * @OA\Post(
     *   path="/api/transfer-handovers/{id}/confirm",
     *   summary="Helper confirms cat condition at handover",
     *   tags={"Transfer Handover"},
     *   security={{"sanctum": {}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(required={"condition_confirmed"}, @OA\Property(property="condition_confirmed", type="boolean"), @OA\Property(property="condition_notes", type="string", nullable=true))),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
     * )
     */
    public function helperConfirm(Request $request, TransferHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->helper_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if ($handover->status !== 'pending') {
            return $this->sendError('Only pending handovers can be confirmed.', 409);
        }
        $data = $request->validate([
            'condition_confirmed' => 'required|boolean',
            'condition_notes' => 'nullable|string',
        ]);

        $handover->status = $data['condition_confirmed'] ? 'confirmed' : 'disputed';
        $handover->condition_confirmed = $data['condition_confirmed'];
        $handover->condition_notes = $data['condition_notes'] ?? null;
        $handover->helper_confirmed_at = now();
        $handover->save();
        // Notify owner about helper confirmation
        Notification::create([
            'user_id' => $handover->owner_user_id,
            'message' => 'Helper has ' . ($handover->status === 'confirmed' ? 'confirmed' : 'disputed') . ' the handover conditions.',
            'link' => '/account/handovers/' . $handover->id,
            'is_read' => false,
        ]);
        return $this->sendSuccess($handover);
    }

    /**
     * @OA\Post(
     *   path="/api/transfer-handovers/{id}/complete",
     *   summary="Complete handover and finalize transfer effects",
     *   tags={"Transfer Handover"},
     *   security={{"sanctum": {}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
     * )
     */
    public function complete(Request $request, TransferHandover $handover)
    {
        // Either party can mark completion when meeting occurred
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->helper_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (!in_array($handover->status, ['confirmed', 'pending'])) {
            return $this->sendError('Handover is not in a completable state.', 409);
        }

        $tr = $handover->transferRequest()->with(['cat', 'placementRequest'])->first();

        DB::transaction(function () use ($handover, $tr) {
            $handover->status = 'completed';
            $handover->completed_at = now();
            $handover->save();

            // Finalize transfer effects depending on relationship type
            $type = $tr->requested_relationship_type;
            if ($type === 'permanent_foster') {
                // Close previous ownership record for current owner; backfill if missing
                $closed = OwnershipHistory::where('cat_id', $tr->cat_id)
                    ->where('user_id', $tr->recipient_user_id)
                    ->whereNull('to_ts')
                    ->update(['to_ts' => now()]);

                if ($closed === 0) {
                    // No open record to close; create a backfilled one starting from earliest known timestamp
                    $from = optional($tr->cat)->created_at ?? (optional($tr->placementRequest)->created_at ?? now());
                    $backfilled = OwnershipHistory::create([
                        'cat_id' => $tr->cat_id,
                        'user_id' => $tr->recipient_user_id,
                        'from_ts' => $from,
                        'to_ts' => now(),
                    ]);
                }

                // Assign new owner
                $tr->cat->update(['user_id' => $tr->initiator_user_id]);

                // Create new ownership history for new owner
                OwnershipHistory::create([
                    'cat_id' => $tr->cat_id,
                    'user_id' => $tr->initiator_user_id,
                    'from_ts' => now(),
                    'to_ts' => null,
                ]);
            } elseif ($type === 'fostering' && Schema::hasTable('foster_assignments')) {
                \App\Models\FosterAssignment::firstOrCreate([
                    'cat_id' => $tr->cat_id,
                    'owner_user_id' => $tr->recipient_user_id,
                    'foster_user_id' => $tr->initiator_user_id,
                    'transfer_request_id' => $tr->id,
                ], [
                    'start_date' => now()->toDateString(),
                    'expected_end_date' => optional($tr->placementRequest)->end_date,
                    'status' => 'active',
                ]);
            }
        });
        // Notify both parties of completion
        Notification::insert([
            [
                'user_id' => $handover->owner_user_id,
                'message' => 'Handover completed.',
                'link' => '/account/handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->helper_user_id,
                'message' => 'Handover completed.',
                'link' => '/account/handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        return $this->sendSuccess($handover->fresh());
    }

    /**
     * @OA\Post(
     *   path="/api/transfer-handovers/{id}/cancel",
     *   summary="Cancel a handover (owner or helper)",
     *   tags={"Transfer Handover"},
     *   security={{"sanctum": {}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
     * )
     */
    public function cancel(Request $request, TransferHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->helper_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (!in_array($handover->status, ['pending', 'confirmed', 'disputed'])) {
            return $this->sendError('Handover cannot be canceled in the current state.', 409);
        }

        $handover->status = 'canceled';
        $handover->canceled_at = now();
        $handover->save();

        Notification::insert([
            [
                'user_id' => $handover->owner_user_id,
                'message' => 'Handover was canceled.',
                'link' => '/account/handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->helper_user_id,
                'message' => 'Handover was canceled.',
                'link' => '/account/handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        return $this->sendSuccess($handover->fresh());
    }

    /**
     * @OA\Get(
     *   path="/api/transfer-requests/{id}/handover",
     *   summary="Get the latest handover for a transfer request (owner or helper)",
     *   tags={"Transfer Handover"},
     *   security={{"sanctum": {}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
     * )
     */
    public function showForTransfer(Request $request, TransferRequest $transferRequest)
    {
        $user = $request->user();
        if (!$user || ($user->id !== $transferRequest->recipient_user_id && $user->id !== $transferRequest->initiator_user_id)) {
            return $this->sendError('Forbidden', 403);
        }
        $handover = TransferHandover::where('transfer_request_id', $transferRequest->id)
            ->orderByDesc('id')
            ->first();
        return $this->sendSuccess($handover);
    }
}
