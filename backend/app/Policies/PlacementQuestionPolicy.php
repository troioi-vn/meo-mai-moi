<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PlacementQuestion;
use App\Models\User;
use App\Policies\Concerns\ChecksAdminRole;
use App\Services\PetAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * Speaking for a listing is a placement power, not an editing power.
 *
 * Everything here routes through PetAccessService::canManagePlacements(), so a
 * direct owner or an active group member may answer and moderate, while an
 * editor, foster or sitter can read the pet but never answer in its name.
 */
class PlacementQuestionPolicy
{
    use ChecksAdminRole;
    use HandlesAuthorization;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    /**
     * Seeing questions that are not yet public. The published ones need no
     * policy at all - they are public by definition.
     */
    public function viewPending(User $user, PlacementQuestion $question): bool
    {
        return $this->canManage($user, $question);
    }

    public function answer(User $user, PlacementQuestion $question): bool
    {
        return $this->canManage($user, $question);
    }

    public function approve(User $user, PlacementQuestion $question): bool
    {
        return $this->canManage($user, $question);
    }

    public function moderate(User $user, PlacementQuestion $question): bool
    {
        return $this->canManage($user, $question);
    }

    private function canManage(User $user, PlacementQuestion $question): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        $question->loadMissing('pet');

        if ($question->pet === null) {
            return false;
        }

        return $this->petAccess->canManagePlacements($user, $question->pet);
    }
}
