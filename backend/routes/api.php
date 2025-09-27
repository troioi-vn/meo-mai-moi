<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FosterAssignmentController;
use App\Http\Controllers\FosterReturnHandoverController;
use App\Http\Controllers\HelperProfileController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\MedicalNoteController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\PetController;
use App\Http\Controllers\PetPhotoController;
use App\Http\Controllers\PlacementRequestController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\TransferHandoverController;
use App\Http\Controllers\TransferRequestController;
use App\Http\Controllers\UnsubscribeController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\VersionController;
use App\Http\Controllers\WeightHistoryController;
use App\Http\Controllers\VaccinationRecordController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/version', [VersionController::class, 'show']);

// Unsubscribe endpoint (no auth required)
Route::post('/unsubscribe', [UnsubscribeController::class, 'unsubscribe']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']); // legacy alias
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Notification preferences
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index']);
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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

    // New pet routes
    Route::get('/my-pets', [PetController::class, 'myPets']);
    Route::get('/my-pets/sections', [PetController::class, 'myPetsSections']);
    Route::post('/pets', [PetController::class, 'store']);
    Route::put('/pets/{pet}', [PetController::class, 'update']);
    Route::delete('/pets/{pet}', [PetController::class, 'destroy'])->name('pets.destroy');
    Route::put('/pets/{pet}/status', [PetController::class, 'updateStatus'])->name('pets.updateStatus');
    Route::get('/pet-types', [PetController::class, 'petTypes']);

    // New pet photo routes
    Route::post('/pets/{pet}/photos', [PetPhotoController::class, 'store']);
    Route::delete('/pets/{pet}/photos/{photo}', [PetPhotoController::class, 'destroy']);
    Route::post('/placement-requests', [PlacementRequestController::class, 'store']);
    Route::delete('/placement-requests/{placementRequest}', [PlacementRequestController::class, 'destroy']);
    Route::post('/placement-requests/{placementRequest}/confirm', [PlacementRequestController::class, 'confirm']);
    Route::post('/placement-requests/{placementRequest}/reject', [PlacementRequestController::class, 'reject']);
    Route::apiResource('helper-profiles', HelperProfileController::class);
    Route::post('helper-profiles/{helperProfile}', [HelperProfileController::class, 'update']);
    Route::delete('helper-profiles/{helperProfile}/photos/{photo}', [HelperProfileController::class, 'destroyPhoto']);
    Route::get('/pets/{pet}/weights', [WeightHistoryController::class, 'index']);
    Route::post('/pets/{pet}/weights', [WeightHistoryController::class, 'store']);
    Route::get('/pets/{pet}/weights/{weight}', [WeightHistoryController::class, 'show'])->whereNumber('weight');
    Route::put('/pets/{pet}/weights/{weight}', [WeightHistoryController::class, 'update'])->whereNumber('weight');
    Route::delete('/pets/{pet}/weights/{weight}', [WeightHistoryController::class, 'destroy'])->whereNumber('weight');

    // Medical Notes
    Route::get('/pets/{pet}/medical-notes', [MedicalNoteController::class, 'index']);
    Route::post('/pets/{pet}/medical-notes', [MedicalNoteController::class, 'store']);
    Route::get('/pets/{pet}/medical-notes/{note}', [MedicalNoteController::class, 'show'])->whereNumber('note');
    Route::put('/pets/{pet}/medical-notes/{note}', [MedicalNoteController::class, 'update'])->whereNumber('note');
    Route::delete('/pets/{pet}/medical-notes/{note}', [MedicalNoteController::class, 'destroy'])->whereNumber('note');

    // Vaccinations
    Route::get('/pets/{pet}/vaccinations', [VaccinationRecordController::class, 'index']);
    Route::post('/pets/{pet}/vaccinations', [VaccinationRecordController::class, 'store']);
    Route::get('/pets/{pet}/vaccinations/{record}', [VaccinationRecordController::class, 'show'])->whereNumber('record');
    Route::put('/pets/{pet}/vaccinations/{record}', [VaccinationRecordController::class, 'update'])->whereNumber('record');
    Route::delete('/pets/{pet}/vaccinations/{record}', [VaccinationRecordController::class, 'destroy'])->whereNumber('record');
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
    // Foster assignment lifecycle
    Route::post('/foster-assignments/{assignment}/complete', [FosterAssignmentController::class, 'complete']);
    Route::post('/foster-assignments/{assignment}/cancel', [FosterAssignmentController::class, 'cancel']);
    Route::post('/foster-assignments/{assignment}/extend', [FosterAssignmentController::class, 'extend']);

    // Foster return handover lifecycle
    Route::post('/foster-assignments/{assignment}/return-handover', [FosterReturnHandoverController::class, 'store']);
    Route::post('/foster-return-handovers/{handover}/confirm', [FosterReturnHandoverController::class, 'ownerConfirm']);
    Route::post('/foster-return-handovers/{handover}/complete', [FosterReturnHandoverController::class, 'complete']);
    // Route::post('/reviews', [ReviewController::class, 'store']);

    // Message Routes
    // Route::post('/messages', [MessageController::class, 'store']);
    // Route::get('/messages', [MessageController::class, 'index']);
    // Route::get('/messages/{message}', [MessageController::class, 'show']);
    // Route::put('/messages/{message}/read', [MessageController::class, 'markAsRead']);
    // Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
});

// New pet routes (public)
Route::get('/pets/placement-requests', [PetController::class, 'placementRequests']);
Route::get('/pets/featured', [PetController::class, 'featured']);
Route::get('/pets/{pet}', [PetController::class, 'show'])->middleware('optional.auth')->whereNumber('pet');
