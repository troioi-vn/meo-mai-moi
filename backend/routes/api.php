<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\CatController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\WeightHistoryController;
use App\Http\Controllers\CatCommentController;
use App\Http\Controllers\HelperProfileController;
use App\Http\Controllers\TransferRequestController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AuthController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::get('/users/me', [UserProfileController::class, 'show']);
    Route::put('/users/me', [UserProfileController::class, 'update']);
    Route::post('/cats', [CatController::class, 'store']);
    Route::put('/cats/{cat}', [CatController::class, 'update']);
    Route::post('/cats/{cat}/medical-records', [MedicalRecordController::class, 'store']);
    Route::post('/cats/{cat}/weight-history', [WeightHistoryController::class, 'store']);
    Route::post('/cats/{cat}/comments', [CatCommentController::class, 'store']);
    Route::post('/helper-profiles', [HelperProfileController::class, 'store']);
    Route::get('/helper-profiles/me', [HelperProfileController::class, 'show']);
    Route::post('/cats/{cat}/transfer-request', [TransferRequestController::class, 'store']);
    Route::post('/transfer-requests/{transferRequest}/accept', [TransferRequestController::class, 'accept']);
    Route::post('/transfer-requests/{transferRequest}/reject', [TransferRequestController::class, 'reject']);
    Route::post('/reviews', [ReviewController::class, 'store']);
});

Route::get('/cats/featured', [CatController::class, 'featured']);
Route::get('/cats', [CatController::class, 'index']);
Route::get('/cats/{cat}', [CatController::class, 'show']);
Route::get('/cats/{cat}/comments', [CatCommentController::class, 'index']);
Route::get('/users/{user}/reviews', [ReviewController::class, 'index']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
