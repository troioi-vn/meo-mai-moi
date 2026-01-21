<?php

declare(strict_types=1);

namespace App\Http\Controllers\NotificationPreference;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/notification-preferences',
    tags: ['Notification Preferences'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'type', type: 'string'),
                                new OA\Property(property: 'label', type: 'string'),
                                new OA\Property(property: 'group', type: 'string'),
                                new OA\Property(property: 'email_enabled', type: 'boolean'),
                                new OA\Property(property: 'in_app_enabled', type: 'boolean'),
                            ]
                        )
                    ),
                ]
            )
        ),
    ]
)]
class GetNotificationPreferencesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $user = Auth::user();
        $preferences = [];

        foreach (NotificationType::cases() as $type) {
            if ($type === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }

            $preference = NotificationPreference::getPreference($user, $type->value);

            $preferences[] = [
                'type' => $type->value,
                'label' => $type->getLabel(),
                'description' => $type->getDescription(),
                'group' => $type->getGroup(),
                'group_label' => $type->getGroupLabel(),
                'email_enabled' => $preference->email_enabled,
                'in_app_enabled' => $preference->in_app_enabled,
            ];
        }

        return $this->sendSuccess($preferences);
    }
}
