<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Ledger;
use App\Models\User;
use App\Services\Finance\LedgerCapabilityService;

class LedgerPolicy
{
    public function __construct(private readonly LedgerCapabilityService $capabilities) {}

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, Ledger $ledger): bool
    {
        return $this->capabilities->isMember($user, $ledger);
    }

    public function update(User $user, Ledger $ledger): bool
    {
        return $this->capabilities->canMutate($user, $ledger);
    }

    public function archive(User $user, Ledger $ledger): bool
    {
        return $this->capabilities->canMutate($user, $ledger);
    }

    public function restore(User $user, Ledger $ledger): bool
    {
        return $ledger->isArchived() && $this->capabilities->isMember($user, $ledger);
    }

    public function delete(User $user, Ledger $ledger): bool
    {
        return ! $ledger->isArchived()
            && $ledger->created_by_user_id === $user->id
            && $this->capabilities->isMember($user, $ledger);
    }

    public function manage(User $user, Ledger $ledger): bool
    {
        return $this->capabilities->canMutate($user, $ledger);
    }
}
