<?php

namespace App\Http\Controllers\EmailVerification;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;

/**
 * Verify email address via web route and redirect to frontend
 */
class VerifyEmailWebController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, $id, $hash)
    {
        // Handle verification via web route; redirect to frontend with status
        // Find the user by ID
        $user = \App\Models\User::find($id);

        $frontend = config('app.frontend_url');

        if (! $user) {
            return redirect()->away(rtrim($frontend, '/').'/email/verify?error=invalid_link');
        }

        // Verify the hash matches the user's email
        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect()->away(rtrim($frontend, '/').'/email/verify?error=invalid_link');
        }

        // Check if the URL is properly signed and not expired
        if (! $request->hasValidSignature()) {
            return redirect()->away(rtrim($frontend, '/').'/email/verify?error=expired_link');
        }

        if ($user->hasVerifiedEmail()) {
            // Ensure user gets logged into a session for SPA when visiting via email link
            \Auth::guard(config('fortify.guard', 'web'))->login($user);

            return redirect()->away(rtrim($frontend, '/').'/?verified=1');
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }
        // Log the user in to create SPA session
        \Auth::guard(config('fortify.guard', 'web'))->login($user);

        return redirect()->away(rtrim($frontend, '/').'/?verified=1');
    }
}
