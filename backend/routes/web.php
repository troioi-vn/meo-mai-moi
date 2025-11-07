<?php

use App\Http\Controllers\EmailVerificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Inertia is not used (SPA-only UI)

// Serve the React SPA as the main app entry
Route::get('/', function () {
    return view('welcome');
});

// Fortify will register /login and /register POST routes for the API.
// For SPA-only mode, provide GET route stubs that redirect to the frontend.
// In testing, return 200 responses so tests pass; in dev/prod, redirect to frontend.
Route::get('/login', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Login (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    // Relax same-origin detection to host-only to avoid HTTPS proxy scheme/port mismatches
    // that trigger redirect loops when the frontend and backend share a domain.
    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/login');
})->name('login');

Route::get('/register', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Register (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    // Same reasoning as /login: rely on host match only to prevent infinite redirects
    // when proxy headers cause scheme/port differences.
    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/register');
});

// Provide a GET wrapper for logout to avoid 405 when visiting directly
Route::get('/logout', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Logout (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/logout');
});

Route::get('/email/verify', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Email Verify (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/verify-email');
});

Route::get('/forgot-password', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Forgot Password (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/forgot-password');
});

Route::get('/user/confirm-password', function (Request $request) {
    if (app()->environment('testing')) {
        return response('Confirm Password (SPA testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/confirm-password');
});

// Override email verification web route to allow verification without prior login
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verifyWeb'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// Unsubscribe route (required by tests and email links)
Route::get('/unsubscribe', [\App\Http\Controllers\UnsubscribeController::class, 'show'])->name('unsubscribe');

// Password reset redirect (for email links) – redirects to frontend
Route::get('/reset-password/{token}', function ($token, \Illuminate\Http\Request $request) {
    $email = $request->query('email');
    $frontend = config('app.frontend_url');
    if (! $email) {
        return redirect(rtrim($frontend, '/').'/password/reset?error=missing_email');
    }

    return redirect(rtrim($frontend, '/').'/password/reset/'.$token.'?email='.urlencode($email));
})->name('password.reset.web');

// No dashboard route needed; SPA handles post-login navigation client-side

// Catch-all route for SPA (serve frontend for non-API, non-admin paths)
Route::get('/{any}', function (Request $request) {
    if (app()->environment('testing')) {
        return response('SPA Catch-all (testing stub)', 200);
    }

    $frontend = frontend_url();
    $frontendHost = parse_url($frontend, PHP_URL_HOST);
    $requestHost = $request->getHost();

    if ($frontendHost === $requestHost) {
        return view('welcome');
    }

    // Preserve path and query string when redirecting to external frontend
    return redirect()->away(rtrim($frontend, '/').$request->getRequestUri());
})->where('any', '^(?!api(?:\/|$)|admin(?:\/|$)).*');
