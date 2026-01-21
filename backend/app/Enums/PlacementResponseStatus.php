<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PlacementResponseStatus: string implements HasColor, HasLabel
{
    case RESPONDED = 'responded';
    case ACCEPTED = 'accepted';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

    public function getLabel(): ?string
    {
        return match ($this) {
            self::RESPONDED => 'Responded',
            self::ACCEPTED => 'Accepted',
            self::REJECTED => 'Rejected',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::RESPONDED => 'info',
            self::ACCEPTED => 'success',
            self::REJECTED => 'danger',
            self::CANCELLED => 'gray',
        };
    }

    /**
     * Check if this status is a terminal state (no further transitions allowed).
     */
    public function isTerminal(): bool
    {
        return in_array($this, [
            self::ACCEPTED,
            self::REJECTED,
            self::CANCELLED,
        ]);
    }

    /**
     * Check if this status allows responding again to the same placement request.
     */
    public function allowsReResponse(): bool
    {
        return $this === self::CANCELLED;
    }

    /**
     * Get the allowed transitions from this status.
     *
     * @return array<PlacementResponseStatus>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::RESPONDED => [self::ACCEPTED, self::REJECTED, self::CANCELLED],
            self::ACCEPTED => [self::REJECTED, self::CANCELLED],
            self::REJECTED, self::CANCELLED => [],
        };
    }

    /**
     * Check if transitioning to the given status is allowed.
     */
    public function canTransitionTo(PlacementResponseStatus $status): bool
    {
        return in_array($status, $this->allowedTransitions());
    }
}
