<?php

declare(strict_types=1);

namespace App\Services\ResourceInvitations;

use App\Models\ResourceInvitation;
use App\Models\User;

interface ResourceInvitationTargetHandler
{
    /**
     * @return array<string, mixed>
     */
    public function preview(ResourceInvitation $invitation, ?User $viewer): array;

    public function canCreate(User $inviter, mixed $target, ?string $requestedRole): bool;

    public function canStillGrant(ResourceInvitation $invitation): bool;

    public function accept(ResourceInvitation $invitation, User $recipient): void;

    /**
     * Broad access already present (any overlapping access), not exact-role.
     */
    public function alreadyHasAccess(ResourceInvitation $invitation, User $recipient): bool;

    /**
     * Exact invited role already active.
     */
    public function alreadyHasInvitedRole(ResourceInvitation $invitation, User $recipient): bool;

    public function destination(ResourceInvitation $invitation, User $recipient): string;

    /**
     * Eagerly load target-specific relations needed for lifecycle operations.
     *
     * @return list<string>
     */
    public function eagerLoadRelations(): array;

    /**
     * Create the target detail row for a new invitation.
     */
    public function storeDetail(ResourceInvitation $invitation, mixed $target, ?string $requestedRole): void;

    /**
     * Serialize a pending invitation for authorized managers (includes share URL).
     *
     * @return array<string, mixed>
     */
    public function serializeForManager(ResourceInvitation $invitation): array;

    /**
     * Payload returned after a successful accept.
     *
     * @return array<string, mixed>
     */
    public function acceptPayload(ResourceInvitation $invitation, User $recipient): array;

    /**
     * Revoke pending invitations for a deleted/archived target.
     */
    public function revokePendingForTarget(mixed $target): int;
}
