<?php

namespace App\Http\Controllers;

use App\Models\FosterAssignment;
use App\Models\FosterReturnHandover;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FosterReturnHandoverController extends Controller
{
    use ApiResponseTrait;

    // Fosterer initiates scheduling a return
    public function store(Request $request, FosterAssignment $assignment)
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
            'link' => '/account/return-handovers/' . $handover->id,
            'is_read' => false,
        ]);
        return $this->sendSuccess($handover, 201);
    }

    // Owner confirms return condition/time
    public function ownerConfirm(Request $request, FosterReturnHandover $handover)
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
            'message' => 'Owner has ' . ($handover->status === 'confirmed' ? 'confirmed' : 'disputed') . ' the return handover.',
            'link' => '/account/return-handovers/' . $handover->id,
            'is_read' => false,
        ]);
        return $this->sendSuccess($handover);
    }

    // Either party can complete the return
    public function complete(Request $request, FosterReturnHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->foster_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (!in_array($handover->status, ['confirmed', 'pending'])) {
            return $this->sendError('Return handover is not in a completable state.', 409);
        }

        $assignment = $handover->assignment;

        DB::transaction(function () use ($handover, $assignment) {
            $handover->status = 'completed';
            $handover->completed_at = now();
            $handover->save();

            if ($assignment && $assignment->status === 'active') {
                $assignment->status = 'completed';
                $assignment->completed_at = now();
                $assignment->save();
            }
        });

        // Notify both parties of completion
        Notification::insert([
            [
                'user_id' => $handover->owner_user_id,
                'message' => 'Return handover completed. Foster assignment closed.',
                'link' => '/account/return-handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->foster_user_id,
                'message' => 'Return handover completed. Thank you for fostering!',
                'link' => '/account/return-handovers/' . $handover->id,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        return $this->sendSuccess($handover->fresh());
    }
}
