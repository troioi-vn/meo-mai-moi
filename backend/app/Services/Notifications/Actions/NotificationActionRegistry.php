<?php

declare(strict_types=1);

namespace App\Services\Notifications\Actions;

use App\Models\Notification;
use App\Models\User;

final class NotificationActionRegistry
{
    /**
     * @var array<string, array<string, NotificationActionHandlerInterface>>
     */
    private array $handlers = [];

    public function register(NotificationActionHandlerInterface $handler): void
    {
        $type = $handler->notificationType();
        $key = $handler->actionKey();

        $this->handlers[$type][$key] = $handler;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function actionsFor(Notification $notification): array
    {
        $type = (string) ($notification->type ?? '');
        if ($type === '') {
            return [];
        }

        $handlersForType = $this->handlers[$type] ?? [];
        if ($handlersForType === []) {
            return [];
        }

        $actions = [];
        foreach ($handlersForType as $handler) {
            $desc = $handler->describe($notification);
            if ($desc !== null) {
                $actions[] = $desc;
            }
        }

        return $actions;
    }

    public function execute(Notification $notification, string $actionKey, User $actor): NotificationActionResult
    {
        $type = (string) ($notification->type ?? '');
        if ($type === '') {
            throw new \InvalidArgumentException('Notification type missing');
        }

        $handler = $this->handlers[$type][$actionKey] ?? null;
        if (! $handler) {
            throw new \InvalidArgumentException('Unknown action');
        }

        return $handler->execute($notification, $actor);
    }
}
