<?php

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * Get invitation statistics for the authenticated user
 */
class GetInvitationStatsController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    public function __invoke(Request $request)
    {
        $user = $request->user();
        $stats = $this->invitationService->getUserInvitationStats($user);

        return $this->sendSuccess($stats);
    }
}
