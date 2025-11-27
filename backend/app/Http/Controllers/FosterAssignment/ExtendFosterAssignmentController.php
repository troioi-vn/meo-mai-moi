<?php

namespace App\Http\Controllers\FosterAssignment;

use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/foster-assignments/{assignment}/extend",
 *     summary="Extend the end date of a foster assignment",
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
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"expected_end_date"},
 *
 *             @OA\Property(property="expected_end_date", type="string", format="date", example="2024-12-31")
 *         )
 *     ),
 *
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
class ExtendFosterAssignmentController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, FosterAssignment $assignment)
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
