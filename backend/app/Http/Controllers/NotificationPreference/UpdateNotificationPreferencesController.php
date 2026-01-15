<?php

namespace App\Http\Controllers\NotificationPreference;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Models\NotificationPreference;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: "/api/notification-preferences",
    tags: ["Notification Preferences"],
    security: [["sanctum" => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            type: "object",
            properties: [
                new OA\Property(property: "preferences", type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "type", type: "string"),
                            new OA\Property(property: "email_enabled", type: "boolean"),
                            new OA\Property(property: "in_app_enabled", type: "boolean"),
                        ]
                    )
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: "OK",
            content: new OA\JsonContent(
                type: "object",
                properties: [
                    new OA\Property(property: "message", type: "string"),
                ]
            )
        ),
        new OA\Response(response: 422, description: "Validation Error"),
    ]
)]
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