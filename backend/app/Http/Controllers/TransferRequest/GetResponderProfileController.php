<?php

namespace App\Http\Controllers\TransferRequest;

use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/transfer-requests/{id}/responder-profile",
 *     summary="Get the responder's helper profile for a given pet transfer request",
 *     tags={"Transfer Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the transfer request",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="The responder's helper profile",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Helper profile not found"
 *     )
 * )
 */
class GetResponderProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('viewResponderProfile', $transferRequest);

        $profile = $transferRequest->helperProfile?->load(['photos', 'user']);
        if (! $profile) {
            return $this->sendError('Helper profile not found.', 404);
        }

        return $this->sendSuccess($profile);
    }
}
