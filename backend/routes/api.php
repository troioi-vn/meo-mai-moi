<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\CatController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\WeightHistoryController;
use App\Http\Controllers\CatCommentController;
use App\Http\Controllers\HelperProfileController;
use App\Http\Controllers\TransferRequestController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatPhotoController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PlacementRequestController;
use App\Http\Controllers\VersionController;

Route::get('/version', [VersionController::class, 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);
});

/*
TODO: What is a purpose of this route??
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::post('/helper-profiles/{helperProfile}/approve', [AdminController::class, 'approveHelperProfile']);
    Route::post('/helper-profiles/{helperProfile}/reject', [AdminController::class, 'rejectHelperProfile']);
});
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/version', function () {
    return response()->json(['version' => 'v0.0.1']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json(['data' => $request->user()]);
    });
    Route::get('/users/me', [UserProfileController::class, 'show']);
    Route::put('/users/me', [UserProfileController::class, 'update']);
    Route::put('/users/me/password', [UserProfileController::class, 'updatePassword']);
    Route::delete('/users/me', [UserProfileController::class, 'destroy']);
    Route::post('/users/me/avatar', [UserProfileController::class, 'uploadAvatar']);
    Route::delete('/users/me/avatar', [UserProfileController::class, 'deleteAvatar']);
    Route::get('/my-cats', [CatController::class, 'myCats']);
    Route::post('/cats', [CatController::class, 'store']);
    Route::put('/cats/{cat}', [CatController::class, 'update']);
    Route::delete('/cats/{cat}', [CatController::class, 'destroy'])->name('cats.destroy');
    Route::put('/cats/{cat}/status', [CatController::class, 'updateStatus'])->name('cats.updateStatus');
    Route::post('/cats/{cat}/photos', [CatPhotoController::class, 'store']);
    Route::delete('/cats/{cat}/photos/{photo}', [CatPhotoController::class, 'destroy']);
    Route::post('/placement-requests', [PlacementRequestController::class, 'store']);
    Route::apiResource('helper-profiles', HelperProfileController::class);
    Route::post('helper-profiles/{helperProfile}', [HelperProfileController::class, 'update']);
    Route::delete('helper-profiles/{helperProfile}/photos/{photo}', [HelperProfileController::class, 'destroyPhoto']);
    #Route::post('/cats/{cat}/medical-records', [MedicalRecordController::class, 'store']);
    #Route::post('/cats/{cat}/weight-history', [WeightHistoryController::class, 'store']);
    #Route::post('/cats/{cat}/comments', [CatCommentController::class, 'store']);
    #Route::post('/helper-profiles', [HelperProfileController::class, 'store']);
    #Route::get('/helper-profiles', [HelperProfileController::class, 'index']);
    #Route::get('/helper-profiles/me', [HelperProfileController::class, 'show']);
    Route::post('/transfer-requests', [TransferRequestController::class, 'store']);
    Route::post('/transfer-requests/{transferRequest}/accept', [TransferRequestController::class, 'accept']);
    Route::post('/transfer-requests/{transferRequest}/reject', [TransferRequestController::class, 'reject']);
    #Route::post('/reviews', [ReviewController::class, 'store']);

    // Message Routes
    #Route::post('/messages', [MessageController::class, 'store']);
    #Route::get('/messages', [MessageController::class, 'index']);
    #Route::get('/messages/{message}', [MessageController::class, 'show']);
    #Route::put('/messages/{message}/read', [MessageController::class, 'markAsRead']);
    #Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
});

Route::get('/cats/{cat}', [CatController::class, 'show'])->middleware('optional.auth');
