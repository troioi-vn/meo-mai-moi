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
 *     path="/api/foster-assignments/{assignment}/cancel",
 *     summary="Cancel a foster assignment (early return)",
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
 *     @OA\RequestBody(
 *         required=false,
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="reason", type="string", example="Emergency situation")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Foster assignment canceled successfully"
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
class CancelFosterAssignmentController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, FosterAssignment $assignment)
    {
        $this->authorize('cancel', $assignment);

        if ($assignment->status !== 'active') {
            return $this->sendError('Only active foster assignments can be canceled.', 409);
        }

        $validatedData = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $assignment->update([
            'status' => 'canceled',
            'canceled_at' => now(),
            'cancellation_reason' => $validatedData['reason'] ?? null,
        ]);

        // Notify both parties
        try {
            $pet = $assignment->pet;
            if ($pet) {
                // Notify owner
                $this->notificationService->send(
                    $assignment->ownerUser,
                    NotificationType::FOSTER_ASSIGNMENT_CANCELED->value,
                    [
                        'message' => 'Foster assignment for '.$pet->name.' has been canceled.',
                        'link' => '/pets/'.$pet->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                    ]
                );

                // Notify fosterer
                $this->notificationService->send(
                    $assignment->fosterUser,
                    NotificationType::FOSTER_ASSIGNMENT_CANCELED->value,
                    [
                        'message' => 'Your foster assignment for '.$pet->name.' has been canceled.',
                        'link' => '/pets/'.$pet->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            // Notification failure is non-fatal; log and continue
            \Log::debug('Failed to send foster assignment cancellation notification', ['error' => $e->getMessage()]);
        }

        return $this->sendSuccess($assignment->fresh());
    }
}
