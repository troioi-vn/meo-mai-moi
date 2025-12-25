<?php

namespace App\Http\Controllers;

use App\Models\Settings;
use App\Models\User;
use App\Services\InvitationService;
use App\Services\WaitlistService;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Contracts\User as GoogleUser;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly InvitationService $invitationService,
        private readonly WaitlistService $waitlistService,
    ) {
    }

    public function redirect(Request $request): RedirectResponse
    {
        $redirectPath = $this->sanitizeRedirectPath($request->string('redirect')->toString());

        if ($redirectPath) {
            $request->session()->put('google_redirect', $redirectPath);
        }

        $invitationCode = $request->string('invitation_code')->toString();
        if ($invitationCode) {
            $request->session()->put('google_invitation_code', $invitationCode);
        }

        /** @var \Laravel\Socialite\Contracts\Provider $provider */
        $provider = Socialite::driver('google');

        return $provider
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

        if (! $email) {
            return $this->redirectToFrontend('/login?error=missing_email');
        }

        // Check if a user with this email already exists (registered via password)
        $existingEmailUser = User::where('email', $email)->first();

        if ($existingEmailUser) {
            // Link Google account to existing user and log them in
            $this->updateGoogleFields($existingEmailUser, $googleUser);
            $existingEmailUser->forceFill(['google_id' => $googleUser->getId()])->save();

            Auth::login($existingEmailUser, true);
            $request->session()->regenerate();

            return $this->redirectToFrontend($this->consumeRedirect($request));
        }

        // Handle invite-only registration
        $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);
        $invitationCode = $request->session()->pull('google_invitation_code');
        $isValidInvitation = $invitationCode && $this->invitationService->validateInvitationCode($invitationCode);

        if ($inviteOnlyEnabled && ! $isValidInvitation) {
            if ($this->waitlistService->isEmailOnWaitlist($email)) {
                return $this->redirectToFrontend('/login?error=already_on_waitlist');
            }

            try {
                $this->waitlistService->addToWaitlist($email);

                return $this->redirectToFrontend('/login?status=added_to_waitlist');
            } catch (Exception $e) {
                report($e);

                return $this->redirectToFrontend('/login?error=waitlist_failed');
            }
        }

        $user = User::create([
            'name' => $googleUser->getName() ?: 'Google User',
            'email' => $email,
            'password' => null,
            'google_id' => $googleUser->getId(),
            'google_token' => $googleUser->token ?? null,
            'google_refresh_token' => $googleUser->refreshToken ?? null,
        ]);

        $this->maybeSetAvatarFromGoogle($user, $googleUser->getAvatar());

        // Consider Google emails verified by default
        $user->forceFill(['email_verified_at' => Carbon::now()])->save();

        // If we had a valid invitation, accept it now
        if ($isValidInvitation) {
            $this->invitationService->acceptInvitation($invitationCode, $user);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return $this->redirectToFrontend($this->consumeRedirect($request));
    }

    private function updateGoogleFields(User $user, GoogleUser $googleUser): void
    {
        $user->forceFill([
            'google_token' => $googleUser->token ?? null,
            'google_refresh_token' => $googleUser->refreshToken ?? null,
        ]);

        if (! $user->email_verified_at) {
            $user->email_verified_at = Carbon::now();
        }

        $user->save();
    }

    private function maybeSetAvatarFromGoogle(User $user, ?string $avatarUrl): void
    {
        if (! $this->isValidGoogleAvatarUrl($avatarUrl)) {
            return;
        }

        if ($user->getMedia('avatar')->isNotEmpty()) {
            return;
        }

        $this->downloadAndAttachAvatar($user, $avatarUrl);
    }

    private function isValidGoogleAvatarUrl(?string $avatarUrl): bool
    {
        if (! $avatarUrl) {
            return false;
        }

        $parsedUrl = parse_url($avatarUrl);
        if (! is_array($parsedUrl)) {
            return false;
        }

        $scheme = strtolower($parsedUrl['scheme'] ?? '');
        $host = strtolower($parsedUrl['host'] ?? '');
        if ($scheme !== 'https' || ! $host) {
            return false;
        }

        $allowedHosts = [
            'googleusercontent.com',
            'ggpht.com',
        ];

        foreach ($allowedHosts as $allowedHost) {
            if ($host === $allowedHost || str_ends_with($host, '.'.$allowedHost)) {
                return true;
            }
        }

        return false;
    }

    private function downloadAndAttachAvatar(User $user, string $avatarUrl): void
    {
        $tmpFile = null;

        try {
            $response = Http::timeout(5)
                ->withUserAgent((string) (config('app.name', 'MeoMaiMoi')).'/1.0 (avatar fetch)')
                ->get($avatarUrl);

            if (! $response->ok()) {
                return;
            }

            $contentType = $response->header('Content-Type');
            $extension = $this->getImageExtensionFromContentType($contentType);
            if (! $extension) {
                return;
            }

            $body = $response->body();
            $maxSize = 5 * 1024 * 1024; // 5MB
            if (strlen($body) > $maxSize) {
                return;
            }

            $tmpPath = tempnam(sys_get_temp_dir(), 'google-avatar-');
            if (! $tmpPath) {
                return;
            }

            $tmpFile = $tmpPath.'.'.$extension;
            @rename($tmpPath, $tmpFile);

            file_put_contents($tmpFile, $body);

            $user->addMedia($tmpFile)
                ->usingFileName('google-avatar.'.$extension)
                ->toMediaCollection('avatar');
        } catch (Exception $exception) {
            report($exception);
        } finally {
            if ($tmpFile && file_exists($tmpFile)) {
                @unlink($tmpFile);
            }
        }
    }

    private function getImageExtensionFromContentType(?string $contentType): ?string
    {
        if (! $contentType || ! str_starts_with(strtolower($contentType), 'image/')) {
            return null;
        }

        return match (strtolower(trim(explode(';', $contentType)[0]))) {
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/jpeg', 'image/jpg' => 'jpg',
            default => null,
        };
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
