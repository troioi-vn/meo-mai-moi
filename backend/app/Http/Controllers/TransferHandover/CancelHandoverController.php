<?php

namespace App\Http\Controllers\TransferHandover;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\TransferHandover;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *   path="/api/transfer-handovers/{id}/cancel",
 *   summary="Cancel a handover (owner or helper)",
 *   tags={"Transfer Handover"},
 *   security={{"sanctum": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
 * )
 */
class CancelHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->helper_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (! in_array($handover->status, ['pending', 'confirmed', 'disputed'])) {
            return $this->sendError('Handover cannot be canceled in the current state.', 409);
        }

        $handover->status = 'canceled';
        $handover->canceled_at = now();
        $handover->save();

        Notification::insert([
            [
                'user_id' => $handover->owner_user_id,
                'message' => 'Handover was canceled.',
                'link' => '/account/handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->helper_user_id,
                'message' => 'Handover was canceled.',
                'link' => '/account/handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        return $this->sendSuccess($handover->fresh());
    }
}
