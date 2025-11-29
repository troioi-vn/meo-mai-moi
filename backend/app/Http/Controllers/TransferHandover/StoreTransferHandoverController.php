<?php

namespace App\Http\Controllers\TransferHandover;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *   path="/api/transfer-requests/{id}/handover",
 *   summary="Initiate a handover for an accepted transfer request (owner only)",
 *   tags={"Transfer Handover"},
 *   security={{"sanctum": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(
 *
 *     @OA\JsonContent(
 *
 *       @OA\Property(property="scheduled_at", type="string", format="date-time", nullable=true),
 *       @OA\Property(property="location", type="string", nullable=true)
 *     )
 *   ),
 *
 *   @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
 * )
 */
class StoreTransferHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
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
            if (! $handover->owner_initiated_at) {
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
            'link' => '/account/handovers/'.$handover->id,
        ]);

        return $this->sendSuccess($handover, 201);
    }
}
