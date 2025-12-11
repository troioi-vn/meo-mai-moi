<?php

namespace App\Http\Controllers;

use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Contracts\User as GoogleUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $redirectPath = $this->sanitizeRedirectPath($request->string('redirect')->toString());

        if ($redirectPath) {
            $request->session()->put('google_redirect', $redirectPath);
        }

        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Exception $exception) {
            report($exception);

            return $this->redirectToFrontend('/login?error=oauth_failed');
        }

        $existingGoogleUser = User::where('google_id', $googleUser->getId())->first();

        if ($existingGoogleUser) {
            $this->updateGoogleFields($existingGoogleUser, $googleUser);

            Auth::login($existingGoogleUser, true);
            $request->session()->regenerate();

            return $this->redirectToFrontend($this->consumeRedirect($request));
        }

        $email = $googleUser->getEmail();

        if ($email && User::where('email', $email)->exists()) {
            return $this->redirectToFrontend('/login?error=email_exists');
        }

        if (! $email) {
            return $this->redirectToFrontend('/login?error=missing_email');
        }

        $user = User::create([
            'name' => $googleUser->getName() ?: 'Google User',
            'email' => $email,
            'password' => null,
            'google_id' => $googleUser->getId(),
            'google_token' => $googleUser->token ?? null,
            'google_refresh_token' => $googleUser->refreshToken ?? null,
            'google_avatar' => $googleUser->getAvatar(),
        ]);

        // Consider Google emails verified by default
        $user->forceFill(['email_verified_at' => Carbon::now()])->save();

        Auth::login($user, true);
        $request->session()->regenerate();

        return $this->redirectToFrontend($this->consumeRedirect($request));
    }

    private function updateGoogleFields(User $user, GoogleUser $googleUser): void
    {
        $user->forceFill([
            'google_token' => $googleUser->token ?? null,
            'google_refresh_token' => $googleUser->refreshToken ?? null,
            'google_avatar' => $googleUser->getAvatar(),
        ]);

        if (! $user->email_verified_at) {
            $user->email_verified_at = Carbon::now();
        }

        $user->save();
    }

    private function sanitizeRedirectPath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (! str_starts_with($path, '/') || str_starts_with($path, '//') || preg_match('#^https?://#i', $path)) {
            return null;
        }

        return $path;
    }

    private function consumeRedirect(Request $request): ?string
    {
        return $this->sanitizeRedirectPath($request->session()->pull('google_redirect'));
    }

    private function redirectToFrontend(?string $path = null): RedirectResponse
    {
        $targetPath = $this->sanitizeRedirectPath($path) ?? '/account/pets';

        return redirect()->away(frontend_url().$targetPath);
    }
}
