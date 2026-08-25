<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Litter;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Database\Eloquent\Collection;

class LitterPolicy
{
    use HandlesAuthorization;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Litter $litter): bool
    {
        return $this->viewableMembers($user, $litter)->isNotEmpty();
    }

    public function create(User $user): bool
    {
        return $user->can('create', Pet::class);
    }

    public function update(User $user, Litter $litter): bool
    {
        return $this->canEditEveryViewableMember($user, $litter);
    }

    public function delete(User $user, Litter $litter): bool
    {
        return $this->canEditEveryViewableMember($user, $litter);
    }

    private function canEditEveryViewableMember(User $user, Litter $litter): bool
    {
        $pets = $this->viewableMembers($user, $litter);

        return $pets->isNotEmpty()
            && $pets->every(fn (Pet $pet): bool => $this->petAccess->canEdit($user, $pet));
    }

    /**
     * @return Collection<int, Pet>
     */
    private function viewableMembers(User $user, Litter $litter): Collection
    {
        $pets = $litter->relationLoaded('pets') ? $litter->pets : $litter->pets()->get();

        return $pets
            ->filter(fn (Pet $pet): bool => $this->petAccess->canView($user, $pet))
            ->values();
    }
}
