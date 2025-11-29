<?php

namespace App\Http\Controllers\TransferHandover;

use App\Http\Controllers\Controller;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *   path="/api/transfer-requests/{id}/handover",
 *   summary="Get the latest handover for a transfer request (owner or helper)",
 *   tags={"Transfer Handover"},
 *   security={{"sanctum": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
 * )
 */
class ShowHandoverForTransferController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $user = $request->user();
        if (! $user || ($user->id !== $transferRequest->recipient_user_id && $user->id !== $transferRequest->initiator_user_id)) {
            return $this->sendError('Forbidden', 403);
        }
        $handover = TransferHandover::where('transfer_request_id', $transferRequest->id)
            ->orderByDesc('id')
            ->first();

        return $this->sendSuccess($handover);
    }
}
