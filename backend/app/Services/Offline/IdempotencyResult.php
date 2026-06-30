<?php

declare(strict_types=1);

namespace App\Services\Offline;

readonly class IdempotencyResult
{
    /**
     * @param  array<string, mixed>|null  $responsePayload
     */
    public function __construct(
        public IdempotencyState $state,
        public ?int $responseStatus = null,
        public ?array $responsePayload = null,
    ) {}

    public static function reserved(): self
    {
        return new self(IdempotencyState::Reserved);
    }

    /**
     * @param  array<string, mixed>  $responsePayload
     */
    public static function replay(int $responseStatus, array $responsePayload): self
    {
        return new self(IdempotencyState::Replay, $responseStatus, $responsePayload);
    }

    public static function conflict(): self
    {
        return new self(IdempotencyState::Conflict);
    }

    public static function inProgress(): self
    {
        return new self(IdempotencyState::InProgress);
    }
}
