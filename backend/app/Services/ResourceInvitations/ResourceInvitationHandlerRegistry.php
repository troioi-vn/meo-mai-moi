<?php

declare(strict_types=1);

namespace App\Services\ResourceInvitations;

use App\Enums\ResourceInvitationType;
use InvalidArgumentException;

class ResourceInvitationHandlerRegistry
{
    /** @var array<string, ResourceInvitationTargetHandler> */
    private array $handlers = [];

    public function register(ResourceInvitationType $type, ResourceInvitationTargetHandler $handler): void
    {
        $this->handlers[$type->value] = $handler;
    }

    public function get(ResourceInvitationType $type): ResourceInvitationTargetHandler
    {
        $handler = $this->handlers[$type->value] ?? null;

        if ($handler === null) {
            throw new InvalidArgumentException("No resource invitation handler registered for type [{$type->value}].");
        }

        return $handler;
    }
}
