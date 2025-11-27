<?php

namespace App\Http\Controllers\FosterReturnHandover;

use App\Http\Controllers\Controller;
use App\Models\FosterReturnHandover;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class OwnerConfirmReturnController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, FosterReturnHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if ($handover->status !== 'pending') {
            return $this->sendError('Only pending return handovers can be confirmed.', 409);
        }
        $data = $request->validate([
            'condition_confirmed' => 'required|boolean',
            'condition_notes' => 'nullable|string',
        ]);

        $handover->status = $data['condition_confirmed'] ? 'confirmed' : 'disputed';
        $handover->condition_confirmed = $data['condition_confirmed'];
        $handover->condition_notes = $data['condition_notes'] ?? null;
        $handover->owner_confirmed_at = now();
        $handover->save();

        // Notify fosterer about owner confirmation
        Notification::create([
            'user_id' => $handover->foster_user_id,
            'message' => 'Owner has '.($handover->status === 'confirmed' ? 'confirmed' : 'disputed').' the return handover.',
            'link' => '/account/return-handovers/'.$handover->id,
        ]);

        return $this->sendSuccess($handover);
    }
}
