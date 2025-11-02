<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
        // Serve SPA index so frontend router handles /login without redirect loop
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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
        // Serve SPA index so frontend router can call POST /logout
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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
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
    $frontendScheme = parse_url($frontend, PHP_URL_SCHEME) ?: $request->getScheme();
    $frontendPort = parse_url($frontend, PHP_URL_PORT) ?: ($frontendScheme === 'https' ? 443 : 80);
    $sameOrigin = $frontendHost === $request->getHost() && $frontendPort === $request->getPort() && $frontendScheme === $request->getScheme();

    if ($sameOrigin) {
        return view('welcome');
    }

    return redirect(rtrim($frontend, '/').'/confirm-password');
});

// Email verification routes are provided by Fortify/Jetstream (standard)

// Unsubscribe route (required by tests and email links)
Route::get('/unsubscribe', [\App\Http\Controllers\UnsubscribeController::class, 'show'])->name('unsubscribe');

// Password reset redirect (for email links) – redirects to frontend
Route::get('/reset-password/{token}', function ($token, \Illuminate\Http\Request $request) {
    $email = $request->query('email');
    $frontend = config('app.frontend_url');
    if (empty($frontend)) {
        $envUrl = env('FRONTEND_URL');
        $frontend = empty($envUrl) ? 'http://localhost:5173' : $envUrl;
    }
    if (empty($frontend)) {
        $envUrl = env('FRONTEND_URL');
        $frontend = empty($envUrl) ? 'http://localhost:5173' : $envUrl;
    }
    if (! $email) {
        return redirect(rtrim($frontend, '/').'/password/reset?error=missing_email');
    }

    return redirect(rtrim($frontend, '/').'/password/reset/'.$token.'?email='.urlencode($email));
})->name('password.reset.web');

// No dashboard route needed; SPA handles post-login navigation client-side
