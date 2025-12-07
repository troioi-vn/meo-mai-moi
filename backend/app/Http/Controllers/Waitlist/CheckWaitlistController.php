<?php

namespace App\Http\Controllers\Waitlist;

use App\Http\Controllers\Controller;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * Check if an email is on the waitlist (for frontend validation)
 */
class CheckWaitlistController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __construct(
        private WaitlistService $waitlistService
    ) {
    }

    public function __invoke(Request $request)
    {
        $this->validateWithErrorHandling($request, [
            'email' => $this->emailValidationRules(),
        ]);

        $email = $request->input('email');
        $isOnWaitlist = $this->waitlistService->isEmailOnWaitlist($email);
        $isRegistered = $this->waitlistService->isEmailRegistered($email);

        return $this->sendSuccess([
            'email' => $email,
            'on_waitlist' => $isOnWaitlist,
            'is_registered' => $isRegistered,
            'can_join_waitlist' => ! $isOnWaitlist && ! $isRegistered,
        ]);
    }
}
