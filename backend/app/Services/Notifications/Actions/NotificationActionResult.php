<?php

declare(strict_types=1);

namespace App\Services\Notifications\Actions;

final class NotificationActionResult
{
    public function __construct(
        public readonly bool $markRead = true,
        public readonly ?string $message = null,
    ) {}
}
