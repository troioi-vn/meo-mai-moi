<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Domain failures in the placement flow that a controller maps to a status code.
 *
 * Services must not reach for HttpResponseException, so anything the placement
 * services need to reject is expressed here and translated at the edge by
 * MapsPlacementExceptions.
 */
class PlacementException extends Exception
{
    /**
     * Another actor settled this response, or accepted a competing one, between
     * the caller's check and our lock. Distinct from an ordinary invalid
     * transition: the caller was not wrong, it was late.
     */
    public static function responseRaceLost(): self
    {
        return new self('response_race_lost');
    }

    /**
     * The pet has no active owner, so there is nobody to transfer from. Broken
     * data rather than a user error, but a clear 409 beats a 500.
     */
    public static function petHasNoOwner(): self
    {
        return new self('pet_has_no_owner');
    }
}
