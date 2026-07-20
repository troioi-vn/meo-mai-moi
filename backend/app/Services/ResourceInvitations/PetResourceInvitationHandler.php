<?php

declare(strict_types=1);

namespace App\Services\ResourceInvitations;

use App\Enums\PetRelationshipType;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetResourceInvitation;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\PetAccessService;
use App\Services\PetRelationshipService;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;
use RuntimeException;

class PetResourceInvitationHandler implements ResourceInvitationTargetHandler
{
    public function __construct(
        private readonly PetAccessService $petAccess,
        private readonly PetRelationshipService $relationshipService,
    ) {
    }

    public function preview(ResourceInvitation $invitation, ?User $viewer): array
    {
        $detail = $this->requireDetail($invitation);
        $pet = $detail->pet;
        $role = $detail->relationship_type;

        if ($pet === null) {
            throw new RuntimeException('no_longer_valid');
        }

        $target = [
            'name' => $pet->name,
            'thumbnail' => $pet->photo_url,
            'pet_type' => $pet->petType === null ? null : [
                'name' => $pet->petType->name,
            ],
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
        if (! $target instanceof Pet) {
            return false;
        }

        if ($requestedRole === null || PetRelationshipType::tryFrom($requestedRole) === null) {
            return false;
        }

        $type = PetRelationshipType::from($requestedRole);
        if (! in_array($type, [PetRelationshipType::OWNER, PetRelationshipType::EDITOR, PetRelationshipType::VIEWER], true)) {
            return false;
        }

        return $this->petAccess->canManagePeople($inviter, $target);
    }

    public function canStillGrant(ResourceInvitation $invitation): bool
    {
        $detail = $invitation->petDetail;

        if ($detail === null) {
            return false;
        }

        $pet = $detail->pet;
        $inviter = $invitation->inviter;

        if ($pet === null || $inviter === null) {
            return false;
        }

        return $this->petAccess->canManagePeople($inviter, $pet);
    }

    public function accept(ResourceInvitation $invitation, User $recipient): void
    {
        $detail = $this->requireDetail($invitation);
        $pet = $detail->pet;
        $type = $detail->relationship_type;
        $inviter = $invitation->inviter;

        if ($pet === null || $type === null || $inviter === null) {
            throw new RuntimeException('no_longer_valid');
        }

        if ($this->alreadyHasInvitedRole($invitation, $recipient)) {
            return;
        }

        $this->relationshipService->assignRelationshipWithUpgrade(
            $recipient,
            $pet,
            $type,
            $inviter
        );
        $pet->touch();
    }

    public function alreadyHasAccess(ResourceInvitation $invitation, User $recipient): bool
    {
        $detail = $this->requireDetail($invitation);
        $pet = $detail->pet;

        if ($pet === null) {
            return false;
        }

        return $this->petAccess->hasDirectViewAccess($recipient, $pet)
            || $this->petAccess->hasGroupAccess($recipient, $pet);
    }

    public function alreadyHasInvitedRole(ResourceInvitation $invitation, User $recipient): bool
    {
        $detail = $this->requireDetail($invitation);
        $pet = $detail->pet;
        $type = $detail->relationship_type;

        if ($pet === null || $type === null) {
            return false;
        }

        return PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('user_id', $recipient->id)
            ->where('relationship_type', $type)
            ->whereNull('end_at')
            ->exists();
    }

    public function destination(ResourceInvitation $invitation, User $recipient): string
    {
        $detail = $this->requireDetail($invitation);

        return '/pets/'.$detail->pet_id;
    }

    public function eagerLoadRelations(): array
    {
        return [
            'petDetail.pet.petType',
            'petDetail.pet.media',
            'inviter',
        ];
    }

    public function storeDetail(ResourceInvitation $invitation, mixed $target, ?string $requestedRole): void
    {
        if (! $target instanceof Pet || $requestedRole === null) {
            throw new InvalidArgumentException('Pet invitations require a pet and relationship type.');
        }

        PetResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'pet_id' => $target->id,
            'relationship_type' => PetRelationshipType::from($requestedRole),
        ]);
    }

    public function scopeForTarget(Builder $query, mixed $target): Builder
    {
        if (! $target instanceof Pet) {
            throw new InvalidArgumentException('Pet invitation queries require a pet target.');
        }

        return $query->whereHas('petDetail', function ($detailQuery) use ($target): void {
            $detailQuery->where('pet_id', $target->id);
        });
    }

    public function serializeForManager(ResourceInvitation $invitation): array
    {
        $detail = $this->requireDetail($invitation);

        return [
            'id' => $invitation->id,
            'type' => ResourceInvitationType::PET->value,
            'token' => $invitation->token,
            'status' => $invitation->status?->value,
            'expires_at' => $invitation->expires_at,
            'created_at' => $invitation->created_at,
            'updated_at' => $invitation->updated_at,
            'invited_by_user_id' => $invitation->invited_by_user_id,
            'invitation_url' => $invitation->getInvitationUrl(),
            'pet_id' => $detail->pet_id,
            'relationship_type' => $detail->relationship_type?->value,
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
            'type' => ResourceInvitationType::PET->value,
            'pet_id' => $detail->pet_id,
            'relationship_type' => $detail->relationship_type?->value,
            'destination' => $this->destination($invitation, $recipient),
        ];
    }

    public function revokePendingForTarget(mixed $target): int
    {
        if (! $target instanceof Pet) {
            return 0;
        }

        $invitationIds = PetResourceInvitation::query()
            ->where('pet_id', $target->id)
            ->pluck('resource_invitation_id');

        if ($invitationIds->isEmpty()) {
            return 0;
        }

        return ResourceInvitation::query()
            ->whereIn('id', $invitationIds)
            ->where('type', ResourceInvitationType::PET)
            ->where('status', ResourceInvitationStatus::PENDING)
            ->update([
                'status' => ResourceInvitationStatus::REVOKED,
                'revoked_at' => now(),
            ]);
    }

    private function requireDetail(ResourceInvitation $invitation): PetResourceInvitation
    {
        $detail = $invitation->petDetail;

        if ($detail === null) {
            $detail = PetResourceInvitation::query()
                ->with(['pet.petType', 'pet.media'])
                ->find($invitation->id);
        }

        if ($detail === null) {
            throw new RuntimeException('no_longer_valid');
        }

        if (! $detail->relationLoaded('pet')) {
            $detail->load(['pet.petType', 'pet.media']);
        }

        return $detail;
    }
}
