<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class GroupException extends Exception
{
    public static function lastAdminRequired(): self
    {
        return new self('last_admin_required');
    }

    public static function notAMember(): self
    {
        return new self('not_a_member');
    }

    public static function alreadyAMember(): self
    {
        return new self('already_a_member');
    }

    public static function petAlreadyAssigned(): self
    {
        return new self('pet_already_assigned');
    }

    public static function notGroupAdmin(): self
    {
        return new self('not_group_admin');
    }

    public static function notPetOwner(): self
    {
        return new self('not_pet_owner');
    }

    public static function invalidName(): self
    {
        return new self('invalid_name');
    }

    public static function petHasLivePlacement(): self
    {
        return new self('pet_has_live_placement');
    }

    public static function forbidden(): self
    {
        return new self('forbidden');
    }
}
