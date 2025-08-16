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
use App\Http\Controllers\TransferHandoverController;
use App\Http\Controllers\FosterReturnHandoverController;

Route::get('/version', [VersionController::class, 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']); // legacy alias
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
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
    Route::get('/my-cats/sections', [CatController::class, 'myCatsSections']);
    Route::post('/cats', [CatController::class, 'store']);
    Route::put('/cats/{cat}', [CatController::class, 'update']);
    Route::delete('/cats/{cat}', [CatController::class, 'destroy'])->name('cats.destroy');
    Route::put('/cats/{cat}/status', [CatController::class, 'updateStatus'])->name('cats.updateStatus');
    Route::post('/cats/{cat}/photos', [CatPhotoController::class, 'store']);
    Route::delete('/cats/{cat}/photos/{photo}', [CatPhotoController::class, 'destroy']);
    Route::post('/placement-requests', [PlacementRequestController::class, 'store']);
    Route::delete('/placement-requests/{placementRequest}', [PlacementRequestController::class, 'destroy']);
    Route::post('/placement-requests/{placementRequest}/confirm', [PlacementRequestController::class, 'confirm']);
    Route::post('/placement-requests/{placementRequest}/reject', [PlacementRequestController::class, 'reject']);
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
    // Owner-only: view responder's helper profile for a transfer request
    Route::get('/transfer-requests/{transferRequest}/responder-profile', [TransferRequestController::class, 'responderProfile']);
    // Transfer handover lifecycle
    Route::get('/transfer-requests/{transferRequest}/handover', [TransferHandoverController::class, 'showForTransfer']);
    Route::post('/transfer-requests/{transferRequest}/handover', [TransferHandoverController::class, 'store']);
    Route::post('/transfer-handovers/{handover}/confirm', [TransferHandoverController::class, 'helperConfirm']);
    Route::post('/transfer-handovers/{handover}/complete', [TransferHandoverController::class, 'complete']);
    Route::post('/transfer-handovers/{handover}/cancel', [TransferHandoverController::class, 'cancel']);
    // Foster return handover lifecycle
    Route::post('/foster-assignments/{assignment}/return-handover', [FosterReturnHandoverController::class, 'store']);
    Route::post('/foster-return-handovers/{handover}/confirm', [FosterReturnHandoverController::class, 'ownerConfirm']);
    Route::post('/foster-return-handovers/{handover}/complete', [FosterReturnHandoverController::class, 'complete']);
    #Route::post('/reviews', [ReviewController::class, 'store']);

    // Message Routes
    #Route::post('/messages', [MessageController::class, 'store']);
    #Route::get('/messages', [MessageController::class, 'index']);
    #Route::get('/messages/{message}', [MessageController::class, 'show']);
    #Route::put('/messages/{message}/read', [MessageController::class, 'markAsRead']);
    #Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
});

// Place static routes before parameter routes and constrain {cat} to numbers to avoid conflicts
Route::get('/cats/placement-requests', [CatController::class, 'placementRequests']);
Route::get('/cats/{cat}', [CatController::class, 'show'])->middleware('optional.auth')->whereNumber('cat');