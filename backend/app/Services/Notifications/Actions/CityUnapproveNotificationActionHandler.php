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

        /** @var City|null $city */
        $city = self::$cityCache[(int) $cityId] ??= City::find($cityId);
        if (! $city) {
            return [
                'key' => $this->actionKey(),
                'label' => __('messages.notifications.actions.city_unapprove.label'),
                'variant' => 'destructive',
                'disabled' => true,
                'disabled_reason' => __('messages.notifications.actions.city_unapprove.disabled_not_found'),
                'confirm' => [
                    'title' => __('messages.notifications.actions.city_unapprove.confirm_title'),
                    'description' => __('messages.notifications.actions.city_unapprove.confirm_description'),
                    'confirm_label' => __('messages.notifications.actions.city_unapprove.label'),
                ],
            ];
        }

        $alreadyUnapproved = $city->approved_at === null;

        return [
            'key' => $this->actionKey(),
            'label' => __('messages.notifications.actions.city_unapprove.label'),
            'variant' => 'destructive',
            'disabled' => $alreadyUnapproved,
            'disabled_reason' => $alreadyUnapproved ? __('messages.notifications.actions.city_unapprove.disabled_already') : null,
            'confirm' => [
                'title' => __('messages.notifications.actions.city_unapprove.confirm_title'),
                'description' => __('messages.notifications.actions.city_unapprove.confirm_description'),
                'confirm_label' => __('messages.notifications.actions.city_unapprove.label'),
            ],
        ];
    }

    public function execute(Notification $notification, User $actor): NotificationActionResult
    {
        if (! $actor->hasRole(['admin', 'super_admin'])) {
            throw new AuthorizationException('Forbidden');
        }

        $cityId = data_get($notification->data, 'city_id');
        if (! $cityId) {
            throw new \InvalidArgumentException('City id missing');
        }

        unset(self::$cityCache[(int) $cityId]);

        /** @var City $city */
        $city = City::query()->findOrFail($cityId);

        if ($city->approved_at !== null) {
            $city->update(['approved_at' => null]);

            return new NotificationActionResult(true, __('messages.notifications.actions.city_unapprove.success'));
        }

        return new NotificationActionResult(true, __('messages.notifications.actions.city_unapprove.already_unapproved'));
    }
}
