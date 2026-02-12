<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PetRelationshipType;
use App\Enums\RelationshipInvitationStatus;
use App\Models\Pet;
use App\Models\RelationshipInvitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class RelationshipInvitationService
{
    public function __construct(
        private PetRelationshipService $relationshipService
    ) {}

    /**
     * Create a new relationship invitation with 1-hour expiry.
     */
    public function createInvitation(Pet $pet, User $inviter, PetRelationshipType $type): RelationshipInvitation
    {
        return RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $inviter->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => $type,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);
    }

    /**
     * Get all pending, non-expired invitations for a pet.
     */
    public function getPendingInvitations(Pet $pet): Collection
    {
        return RelationshipInvitation::forPet($pet)
            ->pending()
            ->where('expires_at', '>', now())
            ->with('inviter')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Validate a token and return the invitation if valid, null otherwise.
     */
    public function validateToken(string $token): ?RelationshipInvitation
    {
        $invitation = RelationshipInvitation::where('token', $token)
            ->with(['pet.petType', 'pet.media', 'inviter'])
            ->first();

        if (! $invitation) {
            return null;
        }

        // isValid() auto-expires if past the deadline
        if (! $invitation->isValid()) {
            return $invitation; // Return it so caller can check status
        }

        return $invitation;
    }

    /**
     * Accept an invitation, creating the relationship and upgrading if needed.
     *
     * Role hierarchy: viewer(1) < editor(2) < owner(3).
     * Accepting a higher-privilege role ends all lower-privilege relationships.
     */
    public function acceptInvitation(RelationshipInvitation $invitation, User $user): void
    {
        DB::transaction(function () use ($invitation, $user): void {
            /** @var Pet $pet */
            $pet = $invitation->pet;
            /** @var PetRelationshipType $newType */
            $newType = $invitation->relationship_type;
            /** @var User $inviter */
            $inviter = $invitation->inviter;

            // Determine types to end based on upgrade hierarchy
            $typesToEnd = $this->getLowerPrivilegeTypes($newType);

            if (! empty($typesToEnd)) {
                $this->relationshipService->endActiveRelationshipsByTypes($user, $pet, $typesToEnd);
            }

            // Create the new relationship (idempotent methods handle duplicates)
            $this->relationshipService->createRelationship(
                $user,
                $pet,
                $newType,
                $inviter
            );

            // Mark invitation as accepted
            $invitation->update([
                'status' => RelationshipInvitationStatus::ACCEPTED,
                'accepted_at' => now(),
                'accepted_by_user_id' => $user->id,
            ]);
        });
    }

    /**
     * Decline an invitation.
     */
    public function declineInvitation(RelationshipInvitation $invitation): void
    {
        $invitation->update([
            'status' => RelationshipInvitationStatus::DECLINED,
            'declined_at' => now(),
        ]);
    }

    /**
     * Revoke an invitation.
     */
    public function revokeInvitation(RelationshipInvitation $invitation): void
    {
        $invitation->update([
            'status' => RelationshipInvitationStatus::REVOKED,
            'revoked_at' => now(),
        ]);
    }

    /**
     * Get all types that are lower privilege than the given type.
     *
     * @return array<PetRelationshipType>
     */
    private function getLowerPrivilegeTypes(PetRelationshipType $type): array
    {
        $hierarchy = [
            PetRelationshipType::VIEWER->value => 1,
            PetRelationshipType::EDITOR->value => 2,
            PetRelationshipType::OWNER->value => 3,
        ];

        $currentLevel = $hierarchy[$type->value] ?? 0;

        return collect($hierarchy)
            ->filter(fn (int $level) => $level < $currentLevel)
            ->keys()
            ->map(fn (string $value) => PetRelationshipType::from($value))
            ->values()
            ->all();
    }
}
