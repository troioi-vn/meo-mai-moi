<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Thrown when an invitation code that passed validation can no longer be
 * accepted, typically because a concurrent sign-up claimed it first.
 */
final class InvitationUnavailableException extends Exception
{
    public function __construct(string $message = 'The invitation is no longer valid.')
    {
        parent::__construct($message);
    }
}
