<?php

use App\Http\Controllers\Auth\CheckEmailController;
use App\Http\Controllers\EmailConfigurationStatusController;
use App\Http\Controllers\EmailVerification\GetVerificationStatusController;
use App\Http\Controllers\Legal\GetPlacementTermsController;
use App\Http\Controllers\EmailVerification\ResendVerificationEmailController;
use App\Http\Controllers\EmailVerification\VerifyEmailController;
use App\Http\Controllers\FosterAssignment\CancelFosterAssignmentController;
use App\Http\Controllers\FosterAssignment\CompleteFosterAssignmentController;
use App\Http\Controllers\FosterAssignment\ExtendFosterAssignmentController;
use App\Http\Controllers\FosterReturnHandover\CompleteReturnHandoverController;
use App\Http\Controllers\FosterReturnHandover\OwnerConfirmReturnController;
use App\Http\Controllers\FosterReturnHandover\StoreFosterReturnHandoverController;
use App\Http\Controllers\HelperProfile\DeleteHelperProfileController;
use App\Http\Controllers\HelperProfile\DeleteHelperProfilePhotoController;
use App\Http\Controllers\HelperProfile\ListHelperProfilesController;
use App\Http\Controllers\HelperProfile\ShowHelperProfileController;
use App\Http\Controllers\HelperProfile\StoreHelperProfileController;
use App\Http\Controllers\HelperProfile\UpdateHelperProfileController;
use App\Http\Controllers\Impersonation\GetImpersonationStatusController;
use App\Http\Controllers\Impersonation\LeaveImpersonationController;
use App\Http\Controllers\Invitation\DeleteInvitationController;
use App\Http\Controllers\Invitation\GetInvitationStatsController;
use App\Http\Controllers\Invitation\ListInvitationsController;
use App\Http\Controllers\Invitation\StoreInvitationController;
use App\Http\Controllers\Invitation\ValidateInvitationCodeController;
use App\Http\Controllers\MailgunWebhookController;
use App\Http\Controllers\MedicalNote\DeleteMedicalNoteController;
use App\Http\Controllers\MedicalNote\ListMedicalNotesController;
use App\Http\Controllers\MedicalNote\ShowMedicalNoteController;
use App\Http\Controllers\MedicalNote\StoreMedicalNoteController;
use App\Http\Controllers\MedicalNote\UpdateMedicalNoteController;
use App\Http\Controllers\MedicalRecord\DeleteMedicalRecordController;
use App\Http\Controllers\MedicalRecord\ListMedicalRecordsController;
use App\Http\Controllers\MedicalRecord\ShowMedicalRecordController;
use App\Http\Controllers\MedicalRecord\StoreMedicalRecordController;
use App\Http\Controllers\MedicalRecord\UpdateMedicalRecordController;
use App\Http\Controllers\Notification\ListNotificationsController;
use App\Http\Controllers\Notification\MarkAllNotificationsReadController;
use App\Http\Controllers\Notification\MarkAsReadLegacyController;
use App\Http\Controllers\Notification\MarkNotificationReadController;
use App\Http\Controllers\NotificationPreference\GetNotificationPreferencesController;
use App\Http\Controllers\NotificationPreference\UpdateNotificationPreferencesController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\Pet\DeletePetController;
use App\Http\Controllers\Pet\ListFeaturedPetsController;
use App\Http\Controllers\Pet\ListMyPetsController;
use App\Http\Controllers\Pet\ListMyPetsSectionsController;
use App\Http\Controllers\Pet\ListPetsWithPlacementRequestsController;
use App\Http\Controllers\Pet\ListPetTypesController;
use App\Http\Controllers\Pet\ShowPetController;
use App\Http\Controllers\Pet\StorePetController;
use App\Http\Controllers\Pet\UpdatePetController;
use App\Http\Controllers\Pet\UpdatePetStatusController;
use App\Http\Controllers\PetMicrochip\DeletePetMicrochipController;
use App\Http\Controllers\PetMicrochip\ListPetMicrochipsController;
use App\Http\Controllers\PetMicrochip\ShowPetMicrochipController;
use App\Http\Controllers\PetMicrochip\StorePetMicrochipController;
use App\Http\Controllers\PetMicrochip\UpdatePetMicrochipController;
use App\Http\Controllers\PetPhoto\DeletePetPhotoController;
use App\Http\Controllers\PetPhoto\SetPrimaryPetPhotoController;
use App\Http\Controllers\PetPhoto\StorePetPhotoController;
use App\Http\Controllers\PlacementRequest\ConfirmPlacementRequestController;
use App\Http\Controllers\PlacementRequest\DeletePlacementRequestController;
use App\Http\Controllers\PlacementRequest\RejectPlacementRequestController;
use App\Http\Controllers\PlacementRequest\StorePlacementRequestController;
use App\Http\Controllers\PushSubscription\DeletePushSubscriptionController;
use App\Http\Controllers\PushSubscription\ListPushSubscriptionsController;
use App\Http\Controllers\PushSubscription\StorePushSubscriptionController;
use App\Http\Controllers\Settings\GetInviteOnlyStatusController;
use App\Http\Controllers\Settings\GetPublicSettingsController;
use App\Http\Controllers\TransferHandover\CancelHandoverController;
use App\Http\Controllers\TransferHandover\CompleteHandoverController;
use App\Http\Controllers\TransferHandover\HelperConfirmHandoverController;
use App\Http\Controllers\TransferHandover\ShowHandoverForTransferController;
use App\Http\Controllers\TransferHandover\StoreTransferHandoverController;
use App\Http\Controllers\TransferRequest\AcceptTransferRequestController;
use App\Http\Controllers\TransferRequest\GetResponderProfileController;
use App\Http\Controllers\TransferRequest\RejectTransferRequestController;
use App\Http\Controllers\TransferRequest\StoreTransferRequestController;
use App\Http\Controllers\Unsubscribe\ProcessUnsubscribeController;
use App\Http\Controllers\UserProfile\DeleteAccountController;
use App\Http\Controllers\UserProfile\DeleteAvatarController;
use App\Http\Controllers\UserProfile\ShowProfileController;
use App\Http\Controllers\UserProfile\UpdatePasswordController;
use App\Http\Controllers\UserProfile\UpdateProfileController;
use App\Http\Controllers\UserProfile\UploadAvatarController;
use App\Http\Controllers\VaccinationRecord\DeleteVaccinationRecordController;
use App\Http\Controllers\VaccinationRecord\ListVaccinationRecordsController;
use App\Http\Controllers\VaccinationRecord\RenewVaccinationRecordController;
use App\Http\Controllers\VaccinationRecord\ShowVaccinationRecordController;
use App\Http\Controllers\VaccinationRecord\StoreVaccinationRecordController;
use App\Http\Controllers\VaccinationRecord\UpdateVaccinationRecordController;
use App\Http\Controllers\VersionController;
use App\Http\Controllers\Waitlist\CheckWaitlistController;
use App\Http\Controllers\Waitlist\JoinWaitlistController;
use App\Http\Controllers\WeightHistory\DeleteWeightController;
use App\Http\Controllers\WeightHistory\ListWeightHistoryController;
use App\Http\Controllers\WeightHistory\ShowWeightController;
use App\Http\Controllers\WeightHistory\StoreWeightController;
use App\Http\Controllers\WeightHistory\UpdateWeightController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/version', [VersionController::class, 'show']);

// Mailgun Webhook (public, signature-verified)
Route::post('/webhooks/mailgun', [MailgunWebhookController::class, 'handle']);

// Email verification handled by Fortify web routes; provide API alias for tests / JSON clients
Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('api.verification.verify');

// Password reset routes - Fortify registers these at root level:
// POST /forgot-password and POST /reset-password
// We add API-prefixed aliases for compatibility with existing tests
Route::post('/password/email', function (\Illuminate\Http\Request $request) {
    return app(\Laravel\Fortify\Http\Controllers\PasswordResetLinkController::class)->store($request);
});

Route::post('/password/reset', function (\Illuminate\Http\Request $request) {
    return app(\Laravel\Fortify\Http\Controllers\NewPasswordController::class)->store($request);
});

// Token validation endpoint for the frontend
Route::get('/password/reset/{token}', [PasswordResetController::class, 'validateToken'])
    ->name('password.reset.validate');

// Public settings endpoints
Route::get('/settings/public', GetPublicSettingsController::class);
Route::get('/settings/invite-only-status', GetInviteOnlyStatusController::class);

// Legal documents (public)
Route::get('/legal/placement-terms', GetPlacementTermsController::class);

// Public waitlist endpoint (rate limited + validated)
Route::post('/waitlist', JoinWaitlistController::class)->middleware(['throttle:5,1', 'validate.invitation']); // 5 requests per minute
Route::post('/waitlist/check', CheckWaitlistController::class)->middleware(['throttle:10,1', 'validate.invitation']); // 10 requests per minute

// Public invitation validation endpoint (rate limited + validated)
Route::post('/invitations/validate', ValidateInvitationCodeController::class)->middleware(['throttle:20,1', 'validate.invitation']); // 20 requests per minute

// Unsubscribe endpoint (no auth required)
Route::post('/unsubscribe', ProcessUnsubscribeController::class);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/email/verification-notification', ResendVerificationEmailController::class)
        ->middleware('throttle:6,1')
        ->name('api.verification.send');
    Route::get('/email/verification-status', GetVerificationStatusController::class);
    Route::get('/email/configuration-status', [EmailConfigurationStatusController::class, 'status']);
});

// Routes that don't require email verification (notifications, email verification management)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', ListNotificationsController::class);
    Route::post('/notifications/mark-as-read', MarkAsReadLegacyController::class); // legacy alias
    Route::post('/notifications/mark-all-read', MarkAllNotificationsReadController::class);
    Route::patch('/notifications/{notification}/read', MarkNotificationReadController::class);

    // Push subscriptions
    Route::get('/push-subscriptions', ListPushSubscriptionsController::class);
    Route::post('/push-subscriptions', StorePushSubscriptionController::class);
    Route::delete('/push-subscriptions', DeletePushSubscriptionController::class);

    // Notification preferences
    Route::get('/notification-preferences', GetNotificationPreferencesController::class);
    Route::put('/notification-preferences', UpdateNotificationPreferencesController::class);
});

// Auth routes - only checkEmail is custom, rest handled by Fortify
Route::post('/check-email', CheckEmailController::class)->middleware('throttle:20,1');

// Impersonation routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/impersonation/status', GetImpersonationStatusController::class);
    Route::post('/impersonation/leave', LeaveImpersonationController::class);
});

// Main application routes that require email verification
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json(['data' => $request->user()]);
    });

    // Invitation management routes (authenticated with rate limiting + validation)
    Route::get('/invitations', ListInvitationsController::class);
    Route::post('/invitations', StoreInvitationController::class)->middleware(['throttle:10,60', 'validate.invitation']); // 10 invitations per hour
    Route::delete('/invitations/{id}', DeleteInvitationController::class)->middleware(['throttle:20,60', 'validate.invitation']); // 20 revocations per hour
    Route::get('/invitations/stats', GetInvitationStatsController::class);

    Route::get('/users/me', ShowProfileController::class);
    Route::put('/users/me', UpdateProfileController::class);
    Route::put('/users/me/password', UpdatePasswordController::class);
    Route::delete('/users/me', DeleteAccountController::class);
    Route::post('/users/me/avatar', UploadAvatarController::class);
    Route::delete('/users/me/avatar', DeleteAvatarController::class);

    // New pet routes
    Route::get('/my-pets', ListMyPetsController::class);
    Route::get('/my-pets/sections', ListMyPetsSectionsController::class);
    Route::post('/pets', StorePetController::class);
    Route::put('/pets/{pet}', UpdatePetController::class);
    Route::delete('/pets/{pet}', DeletePetController::class)->name('pets.destroy');
    // Define delete alias with DELETE method so POST to this path returns 405 instead of 404 (for REST semantics tests)
    Route::delete('/pets/{pet}/delete', DeletePetController::class)->name('pets.destroy.alias');
    Route::put('/pets/{pet}/status', UpdatePetStatusController::class)->name('pets.updateStatus');
    Route::get('/pet-types', ListPetTypesController::class);

    // New pet photo routes
    Route::post('/pets/{pet}/photos', StorePetPhotoController::class);
    Route::delete('/pets/{pet}/photos/{photo}', DeletePetPhotoController::class);
    Route::post('/pets/{pet}/photos/{photo}/set-primary', SetPrimaryPetPhotoController::class);
    Route::post('/placement-requests', StorePlacementRequestController::class);
    Route::delete('/placement-requests/{placementRequest}', DeletePlacementRequestController::class);
    Route::post('/placement-requests/{placementRequest}/confirm', ConfirmPlacementRequestController::class);
    Route::post('/placement-requests/{placementRequest}/reject', RejectPlacementRequestController::class);

    // Helper profiles
    Route::get('/helper-profiles', ListHelperProfilesController::class);
    Route::post('/helper-profiles', StoreHelperProfileController::class);
    Route::get('/helper-profiles/{helperProfile}', ShowHelperProfileController::class);
    Route::put('/helper-profiles/{helperProfile}', UpdateHelperProfileController::class);
    Route::patch('/helper-profiles/{helperProfile}', UpdateHelperProfileController::class);
    Route::post('/helper-profiles/{helperProfile}', UpdateHelperProfileController::class);
    Route::delete('/helper-profiles/{helperProfile}', DeleteHelperProfileController::class);
    Route::delete('/helper-profiles/{helperProfile}/photos/{photo}', DeleteHelperProfilePhotoController::class);

    Route::get('/pets/{pet}/weights', ListWeightHistoryController::class);
    Route::post('/pets/{pet}/weights', StoreWeightController::class);
    Route::get('/pets/{pet}/weights/{weight}', ShowWeightController::class)->whereNumber('weight');
    Route::put('/pets/{pet}/weights/{weight}', UpdateWeightController::class)->whereNumber('weight');
    Route::delete('/pets/{pet}/weights/{weight}', DeleteWeightController::class)->whereNumber('weight');

    // Medical Notes
    Route::get('/pets/{pet}/medical-notes', ListMedicalNotesController::class);
    Route::post('/pets/{pet}/medical-notes', StoreMedicalNoteController::class);
    Route::get('/pets/{pet}/medical-notes/{note}', ShowMedicalNoteController::class)->whereNumber('note');
    Route::put('/pets/{pet}/medical-notes/{note}', UpdateMedicalNoteController::class)->whereNumber('note');
    Route::delete('/pets/{pet}/medical-notes/{note}', DeleteMedicalNoteController::class)->whereNumber('note');

    // Medical Records
    Route::get('/pets/{pet}/medical-records', ListMedicalRecordsController::class);
    Route::post('/pets/{pet}/medical-records', StoreMedicalRecordController::class);
    Route::get('/pets/{pet}/medical-records/{record}', ShowMedicalRecordController::class)->whereNumber('record');
    Route::put('/pets/{pet}/medical-records/{record}', UpdateMedicalRecordController::class)->whereNumber('record');
    Route::delete('/pets/{pet}/medical-records/{record}', DeleteMedicalRecordController::class)->whereNumber('record');

    // Vaccinations
    Route::get('/pets/{pet}/vaccinations', ListVaccinationRecordsController::class);
    Route::post('/pets/{pet}/vaccinations', StoreVaccinationRecordController::class);
    Route::get('/pets/{pet}/vaccinations/{record}', ShowVaccinationRecordController::class)->whereNumber('record');
    Route::put('/pets/{pet}/vaccinations/{record}', UpdateVaccinationRecordController::class)->whereNumber('record');
    Route::delete('/pets/{pet}/vaccinations/{record}', DeleteVaccinationRecordController::class)->whereNumber('record');
    Route::post('/pets/{pet}/vaccinations/{record}/renew', RenewVaccinationRecordController::class)->whereNumber('record');

    // Microchips
    Route::get('/pets/{pet}/microchips', ListPetMicrochipsController::class);
    Route::post('/pets/{pet}/microchips', StorePetMicrochipController::class);
    Route::get('/pets/{pet}/microchips/{microchip}', ShowPetMicrochipController::class)->whereNumber('microchip');
    Route::put('/pets/{pet}/microchips/{microchip}', UpdatePetMicrochipController::class)->whereNumber('microchip');
    Route::delete('/pets/{pet}/microchips/{microchip}', DeletePetMicrochipController::class)->whereNumber('microchip');
    Route::post('/transfer-requests', StoreTransferRequestController::class);
    Route::post('/transfer-requests/{transferRequest}/accept', AcceptTransferRequestController::class);
    Route::post('/transfer-requests/{transferRequest}/reject', RejectTransferRequestController::class);
    // Owner-only: view responder's helper profile for a transfer request
    Route::get('/transfer-requests/{transferRequest}/responder-profile', GetResponderProfileController::class);
    // Transfer handover lifecycle
    Route::get('/transfer-requests/{transferRequest}/handover', ShowHandoverForTransferController::class);
    Route::post('/transfer-requests/{transferRequest}/handover', StoreTransferHandoverController::class);
    Route::post('/transfer-handovers/{handover}/confirm', HelperConfirmHandoverController::class);
    Route::post('/transfer-handovers/{handover}/complete', CompleteHandoverController::class);
    Route::post('/transfer-handovers/{handover}/cancel', CancelHandoverController::class);
    // Foster assignment lifecycle
    Route::post('/foster-assignments/{assignment}/complete', CompleteFosterAssignmentController::class);
    Route::post('/foster-assignments/{assignment}/cancel', CancelFosterAssignmentController::class);
    Route::post('/foster-assignments/{assignment}/extend', ExtendFosterAssignmentController::class);

    // Foster return handover lifecycle
    Route::post('/foster-assignments/{assignment}/return-handover', StoreFosterReturnHandoverController::class);
    Route::post('/foster-return-handovers/{handover}/confirm', OwnerConfirmReturnController::class);
    Route::post('/foster-return-handovers/{handover}/complete', CompleteReturnHandoverController::class);
    // Route::post('/reviews', [ReviewController::class, 'store']);

    // Message Routes
    // Route::post('/messages', [MessageController::class, 'store']);
    // Route::get('/messages', [MessageController::class, 'index']);
    // Route::get('/messages/{message}', [MessageController::class, 'show']);
    // Route::put('/messages/{message}/read', [MessageController::class, 'markAsRead']);
    // Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
});

// New pet routes (public)
Route::get('/pets/placement-requests', ListPetsWithPlacementRequestsController::class);
Route::get('/pets/featured', ListFeaturedPetsController::class);
Route::get('/pets/{pet}', ShowPetController::class)->middleware('optional.auth')->whereNumber('pet');
