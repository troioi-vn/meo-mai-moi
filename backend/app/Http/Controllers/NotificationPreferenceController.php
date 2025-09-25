<?php

namespace App\Http\Controllers;

use App\Enums\NotificationType;
use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Models\NotificationPreference;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

class NotificationPreferenceController extends Controller
{
    use ApiResponseTrait;

    /**
     * Get current user's notification preferences.
     *
     * @OA\Get(
     *   path="/api/notification-preferences",
     *   tags={"Notification Preferences"},
     *   security={{"sanctum":{}}},
     *
     *   @OA\Response(response=200, description="OK",
     *
     *     @OA\JsonContent(
     *       type="object",
     *
     *       @OA\Property(property="data", type="array",
     *
     *         @OA\Items(
     *
     *           @OA\Property(property="type", type="string"),
     *           @OA\Property(property="label", type="string"),
     *           @OA\Property(property="group", type="string"),
     *           @OA\Property(property="email_enabled", type="boolean"),
     *           @OA\Property(property="in_app_enabled", type="boolean")
     *         )
     *       )
     *     )
     *   )
     * )
     */
    public function index()
    {
        $user = Auth::user();
        $preferences = [];

        foreach (NotificationType::cases() as $type) {
            $preference = NotificationPreference::getPreference($user, $type->value);

            $preferences[] = [
                'type' => $type->value,
                'label' => $type->getLabel(),
                'group' => $type->getGroup(),
                'email_enabled' => $preference->email_enabled,
                'in_app_enabled' => $preference->in_app_enabled,
            ];
        }

        return $this->sendSuccess($preferences);
    }

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
    public function update(UpdateNotificationPreferencesRequest $request)
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
