<?php

declare(strict_types=1);

namespace App\Services\ResourceInvitations;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupResourceInvitation;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\Groups\GroupCapabilityService;
use App\Services\Groups\GroupMembershipService;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use RuntimeException;

class GroupResourceInvitationHandler implements ResourceInvitationTargetHandler
{
    public function __construct(
        private readonly GroupCapabilityService $capabilities,
        private readonly GroupMembershipService $memberships,
    ) {}

    public function preview(ResourceInvitation $invitation, ?User $viewer): array
    {
        $detail = $this->requireDetail($invitation);
        $group = $detail->group;
        $role = $detail->role;

        if ($group === null || $group->trashed()) {
            throw new RuntimeException('no_longer_valid');
        }

        $target = [
            'group_id' => $group->id,
            'name' => $group->name,
            'role' => $role?->value,
        ];

        $data = [
            'target' => $target,
        ];

        if ($viewer !== null) {
            $data['already_has_access'] = $this->alreadyHasAccess($invitation, $viewer);
            $data['already_has_invited_role'] = $this->alreadyHasInvitedRole($invitation, $viewer);
        }

        return $data;
    }

    public function canCreate(User $inviter, mixed $target, ?string $requestedRole): bool
    {
        if (! $target instanceof Group) {
            return false;
        }

        if ($requestedRole === null || GroupRole::tryFrom($requestedRole) === null) {
            return false;
        }

        return $this->capabilities->canManage($inviter, $target);
    }

    public function canStillGrant(ResourceInvitation $invitation): bool
    {
        $detail = $invitation->groupDetail;

        if ($detail === null) {
            return false;
        }

        $group = $detail->group;
        $inviter = $invitation->inviter;

        if ($group === null || $group->trashed() || $inviter === null) {
            return false;
        }

        return $this->capabilities->canManage($inviter, $group);
    }

    public function accept(ResourceInvitation $invitation, User $recipient): void
    {
        $detail = $this->requireDetail($invitation);
        $group = $detail->group;
        $role = $detail->role;
        $inviter = $invitation->inviter;

        if ($group === null || $group->trashed() || $role === null || $inviter === null) {
            throw new RuntimeException('no_longer_valid');
        }

        if ($this->alreadyHasInvitedRole($invitation, $recipient)) {
            return;
        }

        $existing = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $recipient->id)
            ->active()
            ->first();

        if ($existing !== null) {
            // Exact-role upgrade: promote member -> admin when invited as admin.
            if ($role === GroupRole::ADMIN && ! $existing->isAdmin()) {
                $this->memberships->updateRole($group, $recipient, GroupRole::ADMIN, $inviter);
            }

            return;
        }

        $this->memberships->addMember($group, $recipient, $role, $inviter);
    }

    public function alreadyHasAccess(ResourceInvitation $invitation, User $recipient): bool
    {
        $detail = $this->requireDetail($invitation);
        $group = $detail->group;

        if ($group === null) {
            return false;
        }

        return $this->capabilities->isActiveMember($recipient, $group);
    }

    public function alreadyHasInvitedRole(ResourceInvitation $invitation, User $recipient): bool
    {
        $detail = $this->requireDetail($invitation);
        $group = $detail->group;
        $role = $detail->role;

        if ($group === null || $role === null) {
            return false;
        }

        return GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $recipient->id)
            ->where('role', $role)
            ->active()
            ->exists();
    }

    public function destination(ResourceInvitation $invitation, User $recipient): string
    {
        $detail = $this->requireDetail($invitation);

        return '/groups/'.$detail->group_id;
    }

    public function eagerLoadRelations(): array
    {
        return [
            'groupDetail.group',
            'inviter',
        ];
    }

    public function storeDetail(ResourceInvitation $invitation, mixed $target, ?string $requestedRole): void
    {
        if (! $target instanceof Group || $requestedRole === null) {
            throw new InvalidArgumentException('Group invitations require a group and role.');
        }

        GroupResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'group_id' => $target->id,
            'role' => GroupRole::from($requestedRole),
        ]);
    }

    public function scopeForTarget(Builder $query, mixed $target): Builder
    {
        if (! $target instanceof Group) {
            throw new InvalidArgumentException('Group invitation queries require a group target.');
        }

        return $query->whereHas('groupDetail', function ($detailQuery) use ($target): void {
            $detailQuery->where('group_id', $target->id);
        });
    }

    public function serializeForManager(ResourceInvitation $invitation): array
    {
        $detail = $this->requireDetail($invitation);

        return [
            'id' => $invitation->id,
            'type' => ResourceInvitationType::GROUP->value,
            'token' => $invitation->token,
            'status' => $invitation->status?->value,
            'expires_at' => $invitation->expires_at,
            'created_at' => $invitation->created_at,
            'updated_at' => $invitation->updated_at,
            'invited_by_user_id' => $invitation->invited_by_user_id,
            'invitation_url' => $invitation->getInvitationUrl(),
            'group_id' => $detail->group_id,
            'role' => $detail->role?->value,
            'inviter' => $invitation->inviter === null ? null : [
                'id' => $invitation->inviter->id,
                'name' => $invitation->inviter->name,
            ],
        ];
    }

    public function acceptPayload(ResourceInvitation $invitation, User $recipient): array
    {
        $detail = $this->requireDetail($invitation);

        return [
            'type' => ResourceInvitationType::GROUP->value,
            'group_id' => $detail->group_id,
            'role' => $detail->role?->value,
            'destination' => $this->destination($invitation, $recipient),
        ];
    }

    public function revokePendingForTarget(mixed $target): int
    {
        if (! $target instanceof Group) {
            return 0;
        }

        $invitationIds = GroupResourceInvitation::query()
            ->where('group_id', $target->id)
            ->pluck('resource_invitation_id');

        if ($invitationIds->isEmpty()) {
            return 0;
        }

        return ResourceInvitation::query()
            ->whereIn('id', $invitationIds)
            ->where('type', ResourceInvitationType::GROUP)
            ->where('status', ResourceInvitationStatus::PENDING)
            ->update([
                'status' => ResourceInvitationStatus::REVOKED,
                'revoked_at' => now(),
            ]);
    }

    private function requireDetail(ResourceInvitation $invitation): GroupResourceInvitation
    {
        $detail = $invitation->groupDetail;

        if ($detail === null) {
            $detail = GroupResourceInvitation::query()
                ->with(['group'])
                ->find($invitation->id);
        }

        if ($detail === null) {
            throw new RuntimeException('no_longer_valid');
        }

        if (! $detail->relationLoaded('group')) {
            $detail->load(['group']);
        }

        return $detail;
    }
}
