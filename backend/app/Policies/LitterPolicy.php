<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Litter;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

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
        $pets = $litter->relationLoaded('pets') ? $litter->pets : $litter->pets()->get();

        if ($pets->isEmpty()) {
            return false;
        }

        foreach ($pets as $pet) {
            if (! $this->petAccess->canView($user, $pet)) {
                return false;
            }
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->can('create', Pet::class);
    }

    public function update(User $user, Litter $litter): bool
    {
        $pets = $litter->relationLoaded('pets') ? $litter->pets : $litter->pets()->get();

        if ($pets->isEmpty()) {
            return false;
        }

        foreach ($pets as $pet) {
            if (! $this->petAccess->canEdit($user, $pet)) {
                return false;
            }
        }

        return true;
    }

    public function delete(User $user, Litter $litter): bool
    {
        $pets = $litter->relationLoaded('pets') ? $litter->pets : $litter->pets()->get();

        if ($pets->isEmpty()) {
            return false;
        }

        foreach ($pets as $pet) {
            if (! $this->petAccess->canEdit($user, $pet)) {
                return false;
            }
        }

        return true;
    }
}
