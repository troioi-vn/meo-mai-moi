<?php

declare(strict_types=1);

namespace App\Http\Controllers\NotificationPreference;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Models\NotificationPreference;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/notification-preferences',
    tags: ['Notification Preferences'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(
                    property: 'preferences',
                    type: 'array',
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: 'type', type: 'string'),
                            new OA\Property(property: 'email_enabled', type: 'boolean'),
                            new OA\Property(property: 'in_app_enabled', type: 'boolean'),
                            new OA\Property(property: 'telegram_enabled', type: 'boolean'),
                            new OA\Property(property: 'expected_email_enabled', type: 'boolean'),
                            new OA\Property(property: 'expected_in_app_enabled', type: 'boolean'),
                            new OA\Property(property: 'expected_telegram_enabled', type: 'boolean'),
                        ]
                    )
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiSuccessMessageResponse')
        ),
        new OA\Response(response: 409, description: 'Notification preference changed'),
        new OA\Response(response: 422, description: 'Validation Error'),
    ]
)]
class UpdateNotificationPreferencesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = Auth::user();

        DB::transaction(function () use ($user, $validated): void {
            foreach ($validated['preferences'] as $preferenceData) {
                NotificationPreference::getPreference($user, $preferenceData['type']);
                $preference = NotificationPreference::query()
                    ->where('user_id', $user->id)
                    ->where('notification_type', $preferenceData['type'])
                    ->lockForUpdate()
                    ->firstOrFail();
                $expected = [
                    'email_enabled' => $preferenceData['expected_email_enabled'] ?? null,
                    'in_app_enabled' => $preferenceData['expected_in_app_enabled'] ?? null,
                    'telegram_enabled' => $preferenceData['expected_telegram_enabled'] ?? null,
                ];
                foreach ($expected as $field => $value) {
                    if ($value !== null && (bool) $preference->{$field} !== (bool) $value) {
                        throw new HttpResponseException(response()->json([
                            'success' => false,
                            'data' => [
                                'notification_type' => $preferenceData['type'],
                                'field' => $field,
                            ],
                            'message' => __('messages.offline.version_conflict'),
                            'error' => __('messages.offline.version_conflict'),
                        ], 409));
                    }
                }

                NotificationPreference::updatePreference(
                    $user,
                    $preferenceData['type'],
                    $preferenceData['email_enabled'],
                    $preferenceData['in_app_enabled'],
                    $preferenceData['telegram_enabled'] ?? null
                );
            }
        });

        return $this->sendSuccessWithMeta(null, 'Notification preferences updated successfully');
    }
}
