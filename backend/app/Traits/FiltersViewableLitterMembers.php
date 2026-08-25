<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\Litter;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetAccessService;

/**
 * Litter access is an intersection: a caller may see a litter when they can view
 * at least one member, and they only ever see the members they can view. Keeping
 * that reduction in one place stops the two endpoints that serialize a litter
 * from drifting apart.
 */
trait FiltersViewableLitterMembers
{
    protected function filterViewableMembers(Litter $litter, User $user, PetAccessService $petAccess): void
    {
        $viewable = $litter->pets
            ->filter(fn (Pet $pet): bool => $petAccess->canView($user, $pet))
            ->values();

        $litter->setRelation('pets', $viewable);
    }
}
