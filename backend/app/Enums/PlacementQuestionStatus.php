<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

/**
 * A public question is never visible on the strength of being asked. Someone
 * entitled to act on the listing has to answer or approve it first, which makes
 * the rescue side the publication gate rather than the platform.
 */
enum PlacementQuestionStatus: string implements HasColor, HasLabel
{
    /** Asked, visible only to people who can manage the pet's placements. */
    case PENDING = 'pending';

    /** Answered or approved, visible to everyone including logged-out visitors. */
    case PUBLISHED = 'published';

    /** Rejected before publication, or withdrawn from public view afterwards. */
    case HIDDEN = 'hidden';

    public function getLabel(): string
    {
        return __("messages.placement_questions.status.{$this->value}");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PENDING => 'warning',
            self::PUBLISHED => 'success',
            self::HIDDEN => 'gray',
        };
    }

    public function isPublic(): bool
    {
        return $this === self::PUBLISHED;
    }
}
