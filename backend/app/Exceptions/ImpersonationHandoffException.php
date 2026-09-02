<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Domain failures in the cross-domain impersonation handoff.
 *
 * The admin panel and the public app sit on different registrable domains, so
 * the handoff is consumed by a controller that has to turn each of these into a
 * status code. Services must not reach for HttpResponseException, so the reasons
 * live here and are mapped at the controller edge.
 */
class ImpersonationHandoffException extends Exception
{
    /** No such token, and no audit row to attribute it to. */
    public static function unknownToken(): self
    {
        return new self('unknown_token');
    }

    /** The token was minted but nobody used it inside its window. */
    public static function expiredToken(): self
    {
        return new self('expired_token');
    }

    /** The token was already spent. Someone is replaying the handoff URL. */
    public static function replayedToken(): self
    {
        return new self('replayed_token');
    }

    /** The impersonator lost the privilege between minting and consuming. */
    public static function impersonatorNotAllowed(): self
    {
        return new self('impersonator_not_allowed');
    }

    /** The target gained a role that puts them out of reach, or went away. */
    public static function targetNotAllowed(): self
    {
        return new self('target_not_allowed');
    }
}
