<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Reasons the gateway's client_credentials exchange is refused. The connector
 * endpoint maps every one of them to the same OAuth `invalid_client` answer, so
 * the reason is for logs and tests, never for the caller.
 */
class McpAgentClientException extends Exception
{
    public static function disabled(): self
    {
        return new self('disabled');
    }

    public static function invalidCredentials(): self
    {
        return new self('invalid_credentials');
    }

    public static function expired(): self
    {
        return new self('expired');
    }

    public static function accountNotAllowed(): self
    {
        return new self('account_not_allowed');
    }

    public static function invalidScope(): self
    {
        return new self('invalid_scope');
    }
}
