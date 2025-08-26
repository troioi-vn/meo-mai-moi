<?php

namespace App\Http\Controllers;

use App\Models\FosterAssignment;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Annotations as OA;
use App\Services\NotificationService;
use App\Enums\NotificationType;

class FosterAssignmentController extends Controller
{
    use ApiResponseTrait;

    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * @OA\Post(
     *     path="/api/foster-assignments/{assignment}/complete",
     *     summary="Complete a foster assignment",
     *     tags={"Foster Assignments"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="assignment",
     *         in="path",
     *         required=true,
     *         description="ID of the foster assignment",
     *         @OA\Schema(type="integer")
     *     ),
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
    public function complete(Request $request, FosterAssignment $assignment)
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
            $cat = $assignment->cat;
            if ($cat) {
                // Notify owner
                $this->notificationService->send(
                    $assignment->ownerUser,
                    NotificationType::FOSTER_ASSIGNMENT_COMPLETED->value,
                    [
                        'message' => 'Foster assignment for ' . $cat->name . ' has been completed.',
                        'link' => '/cats/' . $cat->id,
                        'cat_name' => $cat->name,
                        'cat_id' => $cat->id,
                    ]
                );

                // Notify fosterer
                $this->notificationService->send(
                    $assignment->fosterUser,
                    NotificationType::FOSTER_ASSIGNMENT_COMPLETED->value,
                    [
                        'message' => 'Your foster assignment for ' . $cat->name . ' has been completed.',
                        'link' => '/cats/' . $cat->id,
                        'cat_name' => $cat->name,
                        'cat_id' => $cat->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            // non-fatal
        }

        return $this->sendSuccess($assignment->fresh());
    }

    /**
     * @OA\Post(
     *     path="/api/foster-assignments/{assignment}/cancel",
     *     summary="Cancel a foster assignment (early return)",
     *     tags={"Foster Assignments"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="assignment",
     *         in="path",
     *         required=true,
     *         description="ID of the foster assignment",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=false,
     *         @OA\JsonContent(
     *             @OA\Property(property="reason", type="string", example="Emergency situation")
     *         )
     *     ),
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
    public function cancel(Request $request, FosterAssignment $assignment)
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
            $cat = $assignment->cat;
            if ($cat) {
                // Notify owner
                $this->notificationService->send(
                    $assignment->ownerUser,
                    NotificationType::FOSTER_ASSIGNMENT_CANCELED->value,
                    [
                        'message' => 'Foster assignment for ' . $cat->name . ' has been canceled.',
                        'link' => '/cats/' . $cat->id,
                        'cat_name' => $cat->name,
                        'cat_id' => $cat->id,
                    ]
                );

                // Notify fosterer
                $this->notificationService->send(
                    $assignment->fosterUser,
                    NotificationType::FOSTER_ASSIGNMENT_CANCELED->value,
                    [
                        'message' => 'Your foster assignment for ' . $cat->name . ' has been canceled.',
                        'link' => '/cats/' . $cat->id,
                        'cat_name' => $cat->name,
                        'cat_id' => $cat->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            // non-fatal
        }

        return $this->sendSuccess($assignment->fresh());
    }

    /**
     * @OA\Post(
     *     path="/api/foster-assignments/{assignment}/extend",
     *     summary="Extend the end date of a foster assignment",
     *     tags={"Foster Assignments"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="assignment",
     *         in="path",
     *         required=true,
     *         description="ID of the foster assignment",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"expected_end_date"},
     *             @OA\Property(property="expected_end_date", type="string", format="date", example="2024-12-31")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Foster assignment extended successfully"
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
    public function extend(Request $request, FosterAssignment $assignment)
    {
        $this->authorize('extend', $assignment);

        if ($assignment->status !== 'active') {
            return $this->sendError('Only active foster assignments can be extended.', 409);
        }

        $validatedData = $request->validate([
            'expected_end_date' => 'required|date|after:today',
        ]);

        $assignment->update([
            'expected_end_date' => $validatedData['expected_end_date'],
        ]);

        return $this->sendSuccess($assignment->fresh());
    }
}
