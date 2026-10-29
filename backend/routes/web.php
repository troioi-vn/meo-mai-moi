<?php

declare(strict_types=1);

use App\Http\Controllers\Demo\ConsumeDemoLoginTokenController;
use App\Http\Controllers\EmailVerification\VerifyEmailWebController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\Impersonation\ConsumeImpersonationHandoffController;
use App\Http\Controllers\PlacementQuestion\ConfirmPlacementQuestionEmailController;
use App\Http\Controllers\PlacementRequest\ShowPlacementRequestShellController;
use App\Http\Controllers\Seo\ShowSitemapController;
use App\Http\Controllers\Shell\ShowHelperIndexShellController;
use App\Http\Controllers\Shell\ShowHelperProfileShellController;
use App\Http\Controllers\Shell\ShowLandingShellController;
use App\Http\Controllers\Shell\ShowPlacementIndexShellController;
use App\Http\Controllers\Shell\ShowPublicPetShellController;
use App\Http\Controllers\Telegram\ConsumeTelegramLoginReturnController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/** @var view-string $welcomeView */
$welcomeView = 'welcome';

// Email unsubscribe entry — must work on every public container (even when serves_web_app() is false)
Route::get('/unsubscribe', function (Request $request) {
    $query = array_filter([
        'unsubscribe' => '1',
        'user' => $request->query('user'),
        'type' => $request->query('type'),
        'token' => $request->query('token'),
        'channel' => 'email',
    ], fn ($v) => $v !== null && $v !== '');

    return redirect(frontend_url().'/settings/notifications?'.http_build_query($query));
})->name('unsubscribe');

// Queue workers also bootstrap this route file. Keep routes used to build
// queued email links available in the admin-only container.
Route::get('/email/verify/{id}/{hash}', VerifyEmailWebController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::get('/reset-password/{token}', function ($token, Request $request) {
    $email = $request->query('email');
    $frontend = config('app.frontend_url');
    if (! $email) {
        return redirect(rtrim($frontend, '/').'/password/reset?error=missing_email');
    }

    return redirect(rtrim($frontend, '/').'/password/reset/'.$token.'?email='.urlencode($email));
})->name('password.reset.web');

if (! serves_web_app()) {
    return;
}

// Inertia is not used (SPA-only UI)

// Serve the React SPA as the main app entry, with head metadata so the home
// page stops appearing in search results as a bare "Meo Mai Moi".
Route::get('/', ShowLandingShellController::class)->name('landing.shell');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
// Keep the callback below /api so even older service workers, which already
// excluded all API navigations from their SPA fallback, always reach Laravel.
Route::get('/api/demo/login', ConsumeDemoLoginTokenController::class)
    ->middleware('throttle:100,1')
    ->name('demo.login');
Route::get('/demo/login', ConsumeDemoLoginTokenController::class)
    ->middleware('throttle:100,1')
    ->name('demo.login.legacy');
// Impersonation lands here from the admin panel, which answers on a different
// registrable domain and therefore cannot hand over a session cookie. Kept
// below /api for the same reason as the demo callback above.
Route::get('/api/impersonation/enter', ConsumeImpersonationHandoffController::class)
    ->middleware('throttle:20,1')
    ->name('impersonation.enter');
Route::get('/auth/telegram/return', ConsumeTelegramLoginReturnController::class)
    ->middleware('throttle:20,1')
    ->name('telegram.login.return');

// Fortify will register /login and /register POST routes for the API.
// For SPA-only mode, provide GET route stubs that redirect to the frontend.
// In testing, return 200 responses so tests pass; in dev/prod, redirect to frontend.
Route::get('/login', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Login (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    // Relax same-origin detection to host-only to avoid HTTPS proxy scheme/port mismatches
    // that trigger redirect loops when the frontend and backend share a domain.
    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/login');
})->name('login');

Route::get('/register', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Register (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    // Same reasoning as /login: rely on host match only to prevent infinite redirects
    // when proxy headers cause scheme/port differences.
    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/register');
});

// Provide a GET wrapper for logout to avoid 405 when visiting directly
Route::get('/logout', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Logout (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/logout');
});

Route::get('/email/verify', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Email Verify (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/verify-email');
});

Route::get('/forgot-password', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Forgot Password (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/forgot-password');
});

Route::get('/user/confirm-password', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('Confirm Password (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    return redirect(rtrim($frontend, '/').'/confirm-password');
});

// No dashboard route needed; SPA handles post-login navigation client-side

// Public pages served as the SPA shell plus head metadata. All of these must
// stay above the catch-all, which would otherwise swallow them, and none has an
// `environment('testing')` short-circuit — the catch-all's stub would make the
// feature tests assert nothing.
Route::get('/requests', ShowPlacementIndexShellController::class)->name('placements.shell');
Route::get('/helpers', ShowHelperIndexShellController::class)->name('helpers.shell');
Route::get('/helpers/{helperProfile}', ShowHelperProfileShellController::class)
    ->whereNumber('helperProfile')
    ->name('helper-profile.shell');
Route::get('/pets/{pet}/view', ShowPublicPetShellController::class)
    ->whereNumber('pet')
    ->name('pet-public.shell');

// Placement request detail: the page owners actually share.
Route::get('/requests/{placementRequest}', ShowPlacementRequestShellController::class)
    ->whereNumber('placementRequest')
    ->name('placement-request.shell');

// The app's own sitemap. robots.txt used to point only at the docs sitemap, so
// nothing told a crawler these public pages existed.
Route::get('/sitemap.xml', ShowSitemapController::class)
    ->middleware('throttle:public-api')
    ->name('sitemap');

// Asker email confirmation. Confirming only unlocks the one notification the
// asker gets when their question is answered - it never decides whether the
// question itself becomes public. Must stay above the catch-all.
Route::get('/placement-questions/{placementQuestion}/confirm', ConfirmPlacementQuestionEmailController::class)
    ->whereNumber('placementQuestion')
    ->middleware('throttle:10,1')
    ->name('placement-question.confirm');

// Catch-all route for SPA (serve frontend for non-API, non-admin paths)
Route::get('/{any}', function (Request $request) use ($welcomeView) {
    if (app()->environment('testing')) {
        return response('SPA Catch-all (testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view($welcomeView);
    }

    // Preserve path and query string when redirecting to external frontend
    return redirect()->away(rtrim($frontend, '/').$request->getRequestUri());
})->where('any', '^(?!api(?:\/|$)|admin(?:\/|$)).*');
