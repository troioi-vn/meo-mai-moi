<?php

declare(strict_types=1);

namespace App\Services\Notifications\Actions;

use App\Models\City;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

final class CityUnapproveNotificationActionHandler implements NotificationActionHandlerInterface
{
    public function notificationType(): string
    {
        return 'city_created';
    }

    public function actionKey(): string
    {
        return 'unapprove';
    }

    private static array $cityCache = [];

    public function describe(Notification $notification): ?array
    {
        $cityId = data_get($notification->data, 'city_id');
        if (! $cityId) {
            return null;
        }

        $city = self::$cityCache[(int) $cityId] ??= City::find($cityId);
        if (! $city) {
            return [
                'key' => $this->actionKey(),
                'label' => 'Unapprove',
                'variant' => 'destructive',
                'disabled' => true,
                'disabled_reason' => 'City not found',
                'confirm' => [
                    'title' => 'Unapprove this city?',
                    'description' => 'This will make the city unavailable to regular users until it is approved again.',
                    'confirm_label' => 'Unapprove',
                ],
            ];
        }

        $alreadyUnapproved = $city->approved_at === null;

        return [
            'key' => $this->actionKey(),
            'label' => 'Unapprove',
            'variant' => 'destructive',
            'disabled' => $alreadyUnapproved,
            'disabled_reason' => $alreadyUnapproved ? 'Already unapproved' : null,
            'confirm' => [
                'title' => 'Unapprove this city?',
                'description' => 'This will make the city unavailable to regular users until it is approved again.',
                'confirm_label' => 'Unapprove',
            ],
        ];
    }

    public function execute(Notification $notification, User $actor): NotificationActionResult
    {
        if (! method_exists($actor, 'hasRole') || ! $actor->hasRole(['admin', 'super_admin'])) {
            throw new AuthorizationException('Forbidden');
        }

        $cityId = data_get($notification->data, 'city_id');
        if (! $cityId) {
            throw new \InvalidArgumentException('City id missing');
        }

        unset(self::$cityCache[(int) $cityId]);

        $city = City::query()->findOrFail($cityId);

        if ($city->approved_at !== null) {
            $city->update(['approved_at' => null]);

            return new NotificationActionResult(true, 'City unapproved');
        }

        return new NotificationActionResult(true, 'City already unapproved');
    }
}
