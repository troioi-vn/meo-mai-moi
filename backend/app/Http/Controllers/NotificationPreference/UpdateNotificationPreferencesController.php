<?php

namespace App\Http\Controllers\NotificationPreference;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Models\NotificationPreference;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

/**
 * Update user's notification preferences.
 *
 * @OA\Put(
 *   path="/api/notification-preferences",
 *   tags={"Notification Preferences"},
 *   security={{"sanctum":{}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(
 *       type="object",
 *
 *       @OA\Property(property="preferences", type="array",
 *
 *         @OA\Items(
 *
 *           @OA\Property(property="type", type="string"),
 *           @OA\Property(property="email_enabled", type="boolean"),
 *           @OA\Property(property="in_app_enabled", type="boolean")
 *         )
 *       )
 *     )
 *   ),
 *
 *   @OA\Response(response=200, description="OK",
 *
 *     @OA\JsonContent(
 *       type="object",
 *
 *       @OA\Property(property="message", type="string")
 *     )
 *   ),
 *
 *   @OA\Response(response=422, description="Validation Error")
 * )
 */
class UpdateNotificationPreferencesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(UpdateNotificationPreferencesRequest $request)
    {
        $validated = $request->validated();
        $user = Auth::user();

        foreach ($validated['preferences'] as $preferenceData) {
            NotificationPreference::updatePreference(
                $user,
                $preferenceData['type'],
                $preferenceData['email_enabled'],
                $preferenceData['in_app_enabled']
            );
        }

        return $this->sendSuccessWithMeta(null, 'Notification preferences updated successfully');
    }
}
