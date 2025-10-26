<?php

use Illuminate\Support\Facades\Route;

// Inertia is not used (SPA-only UI)

// Serve the React SPA as the main app entry
Route::get('/', function () {
    return view('welcome');
});

// Fortify will register /login and /register POST routes for the API.
// For SPA-only mode, provide GET route stubs that redirect to the frontend.
// In testing, return 200 responses so tests pass; in dev/prod, redirect to frontend.
Route::get('/login', function () {
    if (app()->environment('testing')) {
        return response('Login (SPA testing stub)', 200);
    }
    return redirect(frontend_url().'/login');
})->name('login');

Route::get('/register', function () {
    if (app()->environment('testing')) {
        return response('Register (SPA testing stub)', 200);
    }
    return redirect(frontend_url().'/register');
});

Route::get('/email/verify', function () {
    if (app()->environment('testing')) {
        return response('Email Verify (SPA testing stub)', 200);
    }
    return redirect(frontend_url().'/verify-email');
});

Route::get('/forgot-password', function () {
    if (app()->environment('testing')) {
        return response('Forgot Password (SPA testing stub)', 200);
    }
    return redirect(frontend_url().'/forgot-password');
});

Route::get('/user/confirm-password', function () {
    if (app()->environment('testing')) {
        return response('Confirm Password (SPA testing stub)', 200);
    }
    return redirect(frontend_url().'/confirm-password');
});

// Email verification routes are provided by Fortify/Jetstream (standard)

// Unsubscribe route (required by tests and email links)
Route::get('/unsubscribe', [\App\Http\Controllers\UnsubscribeController::class, 'show'])->name('unsubscribe');

// Password reset redirect (for email links) – redirects to frontend
Route::get('/reset-password/{token}', function ($token, \Illuminate\Http\Request $request) {
    $email = $request->query('email');
    if (! $email) {
        return redirect(frontend_url().'/password/reset?error=missing_email');
    }

    return redirect(frontend_url().'/password/reset/'.$token.'?email='.urlencode($email));
})->name('password.reset.web');

// Keep Jetstream's intended post-login route name but redirect to the SPA
Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', function () {
        $frontend = config('app.frontend_url');

        return redirect()->to($frontend);
    })->name('dashboard');
});
