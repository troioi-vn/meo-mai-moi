<?php

declare(strict_types=1);

namespace App\Services\Notifications\Actions;

use App\Models\Notification;
use App\Models\User;

interface NotificationActionHandlerInterface
{
    public function notificationType(): string;

    public function actionKey(): string;

    /**
     * Describe the action for UI rendering.
     *
     * Return null if this action does not apply to this notification instance.
     *
     * @return array{
     *   key: string,
     *   label: string,
     *   variant?: 'default'|'secondary'|'outline'|'ghost'|'destructive'|'link',
     *   disabled?: bool,
     *   disabled_reason?: string|null,
     *   confirm?: array{title: string, description?: string|null, confirm_label?: string|null}
     * }|null
     */
    public function describe(Notification $notification): ?array;

    public function execute(Notification $notification, User $actor): NotificationActionResult;
}
