<?php

namespace App\Http\Controllers\FosterReturnHandover;

use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Models\FosterReturnHandover;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class StoreFosterReturnHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, FosterAssignment $assignment)
    {
        $user = $request->user();
        if ($user->id !== $assignment->foster_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if ($assignment->status !== 'active') {
            return $this->sendError('Only active foster assignments can be returned.', 409);
        }

        $data = $request->validate([
            'scheduled_at' => 'nullable|date',
            'location' => 'nullable|string|max:255',
        ]);

        $handover = FosterReturnHandover::create([
            'foster_assignment_id' => $assignment->id,
            'owner_user_id' => $assignment->owner_user_id,
            'foster_user_id' => $assignment->foster_user_id,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'location' => $data['location'] ?? null,
            'status' => 'pending',
            'foster_initiated_at' => now(),
        ]);

        // Notify owner about return scheduling
        Notification::create([
            'user_id' => $handover->owner_user_id,
            'message' => 'Fosterer scheduled a return handover.',
            'link' => '/account/return-handovers/'.$handover->id,
        ]);

        return $this->sendSuccess($handover, 201);
    }
}
