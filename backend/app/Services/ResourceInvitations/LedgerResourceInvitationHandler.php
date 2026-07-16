<?php

declare(strict_types=1);

namespace App\Services\ResourceInvitations;

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Ledger;
use App\Models\LedgerMembership;
use App\Models\LedgerResourceInvitation;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\Finance\LedgerCapabilityService;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use RuntimeException;

class LedgerResourceInvitationHandler implements ResourceInvitationTargetHandler
{
    public function __construct(private readonly LedgerCapabilityService $capabilities) {}

    public function preview(ResourceInvitation $invitation, ?User $viewer): array
    {
        $ledger = $this->ledger($invitation);
        $data = ['target' => ['name' => $ledger->title, 'role' => 'member', 'currency_code' => $ledger->currency_code]];
        if ($viewer !== null) {
            $data['already_has_access'] = $this->alreadyHasAccess($invitation, $viewer);
            $data['already_has_invited_role'] = $data['already_has_access'];
        }

        return $data;
    }

    public function canCreate(User $inviter, mixed $target, ?string $requestedRole): bool
    {
        return $target instanceof Ledger && $this->capabilities->canMutate($inviter, $target);
    }

    public function canStillGrant(ResourceInvitation $invitation): bool
    {
        try {
            $ledger = $this->ledger($invitation);
        } catch (RuntimeException) {
            return false;
        }

        return ! $ledger->isArchived() && $invitation->inviter !== null && $this->capabilities->isMember($invitation->inviter, $ledger);
    }

    public function accept(ResourceInvitation $invitation, User $recipient): void
    {
        $ledger = $this->ledger($invitation);
        if ($this->alreadyHasAccess($invitation, $recipient)) {
            return;
        }
        LedgerMembership::query()->create(['ledger_id' => $ledger->id, 'user_id' => $recipient->id, 'invited_by_user_id' => $invitation->invited_by_user_id, 'start_at' => now()]);
    }

    public function alreadyHasAccess(ResourceInvitation $invitation, User $recipient): bool
    {
        return $this->capabilities->isMember($recipient, $this->ledger($invitation));
    }

    public function alreadyHasInvitedRole(ResourceInvitation $invitation, User $recipient): bool
    {
        return $this->alreadyHasAccess($invitation, $recipient);
    }

    public function destination(ResourceInvitation $invitation, User $recipient): string
    {
        return '/finance';
    }

    public function eagerLoadRelations(): array
    {
        return ['ledgerDetail.ledger', 'inviter'];
    }

    public function storeDetail(ResourceInvitation $invitation, mixed $target, ?string $requestedRole): void
    {
        if (! $target instanceof Ledger) {
            throw new InvalidArgumentException('Ledger invitations require a ledger.');
        }
        LedgerResourceInvitation::query()->create(['resource_invitation_id' => $invitation->id, 'ledger_id' => $target->id]);
    }

    public function scopeForTarget(Builder $query, mixed $target): Builder
    {
        if (! $target instanceof Ledger) {
            throw new InvalidArgumentException('Ledger invitation queries require a ledger target.');
        }

        return $query->whereHas('ledgerDetail', fn ($detail) => $detail->where('ledger_id', $target->id));
    }

    public function serializeForManager(ResourceInvitation $invitation): array
    {
        $ledger = $this->ledger($invitation);

        return ['id' => $invitation->id, 'type' => ResourceInvitationType::LEDGER->value, 'token' => $invitation->token, 'status' => $invitation->status->value, 'expires_at' => $invitation->expires_at, 'created_at' => $invitation->created_at, 'invited_by_user_id' => $invitation->invited_by_user_id, 'invitation_url' => $invitation->getInvitationUrl(), 'ledger_id' => $ledger->id, 'ledger_title' => $ledger->title];
    }

    public function acceptPayload(ResourceInvitation $invitation, User $recipient): array
    {
        return ['type' => ResourceInvitationType::LEDGER->value, 'ledger_id' => $this->ledger($invitation)->id, 'destination' => '/finance'];
    }

    public function revokePendingForTarget(mixed $target): int
    {
        if (! $target instanceof Ledger) {
            return 0;
        }
        $ids = LedgerResourceInvitation::query()->where('ledger_id', $target->id)->pluck('resource_invitation_id');

        return ResourceInvitation::query()->whereIn('id', $ids)->where('status', ResourceInvitationStatus::PENDING)->update(['status' => ResourceInvitationStatus::REVOKED, 'revoked_at' => now()]);
    }

    private function ledger(ResourceInvitation $invitation): Ledger
    {
        $detail = $invitation->ledgerDetail ?? LedgerResourceInvitation::query()->with('ledger')->find($invitation->id);
        $ledger = $detail?->ledger;
        if (! $ledger instanceof Ledger) {
            throw new RuntimeException('no_longer_valid');
        }

        return $ledger;
    }
}
