<?php

declare(strict_types=1);

namespace App\Enums;

enum PlacementResponseStatus: string
{
    case RESPONDED = 'responded';
    case ACCEPTED = 'accepted';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

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
