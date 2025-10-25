<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
// Inertia is not used (SPA-only UI)

// Serve the React SPA as the main app entry
Route::get('/', function () {
    return view('welcome');
});

// Fortify will register /login and /register routes when views are enabled.
// No need for custom stubs here.

// Helper to resolve the frontend URL from config or env
if (!function_exists('frontend_url')) {
    function frontend_url(): string {
        return config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
    }
}

// Email verification routes are provided by Fortify/Jetstream (standard)

// Unsubscribe route (required by tests and email links)
Route::get('/unsubscribe', [\App\Http\Controllers\UnsubscribeController::class, 'show'])->name('unsubscribe');

// Password reset redirect (for email links) – redirects to frontend
Route::get('/reset-password/{token}', function ($token, \Illuminate\Http\Request $request) {
    $email = $request->query('email');
    if (!$email) {
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
        $frontend = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
        return redirect()->to($frontend);
    })->name('dashboard');
});
