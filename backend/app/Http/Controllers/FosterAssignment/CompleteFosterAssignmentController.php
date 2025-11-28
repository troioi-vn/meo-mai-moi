<?php

namespace App\Http\Controllers\FosterAssignment;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/foster-assignments/{assignment}/complete",
 *     summary="Complete a foster assignment",
 *     tags={"Foster Assignments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="assignment",
 *         in="path",
 *         required=true,
 *         description="ID of the foster assignment",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Foster assignment completed successfully"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Foster assignment not found"
 *     )
 * )
 */
use Illuminate\Support\Facades\Log;

class CompleteFosterAssignmentController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, FosterAssignment $assignment)
    {
        $this->authorize('complete', $assignment);

        if ($assignment->status !== 'active') {
            return $this->sendError('Only active foster assignments can be completed.', 409);
        }

        $assignment->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Notify both parties
        try {
            $pet = $assignment->pet;
            if ($pet) {
                // Notify owner
                $this->notificationService->send(
                    $assignment->ownerUser,
                    NotificationType::FOSTER_ASSIGNMENT_COMPLETED->value,
                    [
                        'message' => 'Foster assignment for '.$pet->name.' has been completed.',
                        'link' => '/pets/'.$pet->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                    ]
                );

                // Notify fosterer
                $this->notificationService->send(
                    $assignment->fosterUser,
                    NotificationType::FOSTER_ASSIGNMENT_COMPLETED->value,
                    [
                        'message' => 'Your foster assignment for '.$pet->name.' has been completed.',
                        'link' => '/pets/'.$pet->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to send notification for foster assignment completion', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->sendSuccess($assignment->fresh());
    }
}
