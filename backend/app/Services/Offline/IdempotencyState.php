<?php

declare(strict_types=1);

namespace App\Services\Offline;

enum IdempotencyState: string
{
    case Reserved = 'reserved';
    case Replay = 'replay';
    case Conflict = 'conflict';
    case InProgress = 'in_progress';
}
