<?php

namespace App\Http\Controllers\FosterReturnHandover;

use App\Http\Controllers\Controller;
use App\Models\FosterReturnHandover;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompleteReturnHandoverController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, FosterReturnHandover $handover)
    {
        $user = $request->user();
        if ($user->id !== $handover->owner_user_id && $user->id !== $handover->foster_user_id) {
            return $this->sendError('Forbidden', 403);
        }
        if (! in_array($handover->status, ['confirmed', 'pending'])) {
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
                'link' => '/account/return-handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'user_id' => $handover->foster_user_id,
                'message' => 'Return handover completed. Thank you for fostering!',
                'link' => '/account/return-handovers/'.$handover->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        return $this->sendSuccess($handover->fresh());
    }
}
