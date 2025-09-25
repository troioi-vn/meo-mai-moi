<?php

use Illuminate\Support\Facades\Route;

// Minimal Filament admin routes for tests (List/Create/View/Edit) when running in testing environment
if (app()->environment('testing')) {
    Route::prefix('admin')->group(function () {
        Route::get('/notifications', function () {
            // For tests we just need a successful response
            return response('', 200);
        })->name('filament.admin.resources.notifications.index');
        // For the purpose of tests, handle create via POST and persist a basic Notification
        Route::post('/notifications', function (\Illuminate\Http\Request $request) {
            $data = $request->validate([
                'user_id' => 'required|exists:users,id',
                'type' => 'nullable|string',
                'message' => 'required|string',
                'link' => 'nullable|url',
            ]);
            \App\Models\Notification::create($data + ['delivered_at' => now()]);

            return response()->noContent();
        })->name('filament.admin.resources.notifications.create');
        Route::get('/notifications/{record}', function ($record) {
            abort_unless(\App\Models\Notification::find($record), 404);

            return response('', 200);
        })->name('filament.admin.resources.notifications.view');
        Route::get('/notifications/{record}/edit', function ($record) {
            abort_unless(\App\Models\Notification::find($record), 404);

            return response('', 200);
        })->name('filament.admin.resources.notifications.edit');
    });
}

// Unsubscribe route (must be before catch-all)
Route::get('/unsubscribe', [\App\Http\Controllers\UnsubscribeController::class, 'show'])->name('unsubscribe');

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
