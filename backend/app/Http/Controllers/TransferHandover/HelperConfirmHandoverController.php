<?php

namespace App\Http\Controllers\TransferHandover;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\TransferHandover;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *   path="/api/transfer-handovers/{id}/confirm",
 *   summary="Helper confirms pet condition at handover",
 *   tags={"Transfer Handover"},
 *   security={{"sanctum": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\RequestBody(@OA\JsonContent(required={"condition_confirmed"}, @OA\Property(property="condition_confirmed", type="boolean"), @OA\Property(property="condition_notes", type="string", nullable=true))),
 *
 *   @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/TransferHandover")))
 * )
 */
class HelperConfirmHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferHandover $handover)
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
            'message' => 'Helper has '.($handover->status === 'confirmed' ? 'confirmed' : 'disputed').' the handover conditions.',
            'link' => '/account/handovers/'.$handover->id,
        ]);

        return $this->sendSuccess($handover);
    }
}
