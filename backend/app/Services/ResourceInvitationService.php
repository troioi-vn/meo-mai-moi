<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitations\ResourceInvitationHandlerRegistry;
use App\Services\ResourceInvitations\ResourceInvitationTargetHandler;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ResourceInvitationService
{
    public function __construct(
        private readonly ResourceInvitationHandlerRegistry $registry,
    ) {}

    public function handlerFor(ResourceInvitationType $type): ResourceInvitationTargetHandler
    {
        return $this->registry->get($type);
    }

    public function create(
        ResourceInvitationType $type,
        User $inviter,
        mixed $target,
        ?string $requestedRole = null,
    ): ResourceInvitation {
        $handler = $this->handlerFor($type);

        if (! $handler->canCreate($inviter, $target, $requestedRole)) {
            throw new RuntimeException('Invitation creation is not allowed.');
        }

        return DB::transaction(function () use ($type, $inviter, $target, $requestedRole, $handler): ResourceInvitation {
            $invitation = ResourceInvitation::query()->create([
                'type' => $type,
                'token' => ResourceInvitation::generateUniqueToken(),
                'invited_by_user_id' => $inviter->id,
                'status' => ResourceInvitationStatus::PENDING,
                'expires_at' => now()->add($this->ttlFor($type)),
            ]);

            $handler->storeDetail($invitation, $target, $requestedRole);
            $invitation->load($handler->eagerLoadRelations());

            return $invitation;
        });
    }

    /**
     * @return Collection<int, ResourceInvitation>
     */
    public function listPendingForTarget(ResourceInvitationType $type, mixed $target): Collection
    {
        $handler = $this->handlerFor($type);

        $query = ResourceInvitation::query()
            ->ofType($type)
            ->pending()
            ->where('expires_at', '>', now());

        return $handler->scopeForTarget($query, $target)
            ->with($handler->eagerLoadRelations())
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Find by token and persist expiry transition when needed (service-owned mutation).
     */
    public function findByToken(string $token): ?ResourceInvitation
    {
        $invitation = ResourceInvitation::query()
            ->where('token', $token)
            ->first();

        if ($invitation === null) {
            return null;
        }

        $this->markExpiredIfNeeded($invitation);
        $invitation->load($this->handlerFor($invitation->type)->eagerLoadRelations());

        return $invitation;
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(ResourceInvitation $invitation, ?User $viewer): array
    {
        $handler = $this->handlerFor($invitation->type);
        $this->markExpiredIfNeeded($invitation);

        $shared = [
            'type' => $invitation->type->value,
            'status' => $invitation->status->value,
            'expires_at' => $invitation->expires_at,
            'is_valid' => $invitation->isPendingAndUnexpired() && $handler->canStillGrant($invitation),
            'is_authenticated' => $viewer !== null,
            'inviter' => [
                'name' => $invitation->inviter->name,
            ],
        ];

        $targetPreview = $handler->preview($invitation, $viewer);

        if ($viewer !== null) {
            $shared['is_self_invitation'] = $invitation->invited_by_user_id === $viewer->id;
        }

        return array_merge($shared, $targetPreview);
    }

    /**
     * @return array<string, mixed>
     */
    public function accept(ResourceInvitation $invitation, User $recipient): array
    {
        if ($invitation->invited_by_user_id === $recipient->id) {
            throw new RuntimeException('cannot_accept_own');
        }

        /** @var array{error?: string, payload?: array<string, mixed>} $outcome */
        $outcome = DB::transaction(function () use ($invitation, $recipient): array {
            /** @var ResourceInvitation $locked */
            $locked = ResourceInvitation::query()
                ->whereKey($invitation->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->markExpiredIfNeeded($locked);

            if (! $locked->isPendingAndUnexpired()) {
                return ['error' => 'no_longer_valid'];
            }

            $handler = $this->handlerFor($locked->type);
            $locked->load($handler->eagerLoadRelations());

            if (! $handler->canStillGrant($locked)) {
                $this->markRevoked($locked);

                return ['error' => 'no_longer_valid'];
            }

            $handler->accept($locked, $recipient);

            $locked->update([
                'status' => ResourceInvitationStatus::ACCEPTED,
                'accepted_at' => now(),
                'accepted_by_user_id' => $recipient->id,
            ]);

            return [
                'payload' => $handler->acceptPayload(
                    $locked->fresh($handler->eagerLoadRelations()),
                    $recipient
                ),
            ];
        });

        if (isset($outcome['error'])) {
            throw new RuntimeException($outcome['error']);
        }

        return $outcome['payload'] ?? throw new RuntimeException('no_longer_valid');
    }

    public function decline(ResourceInvitation $invitation, User $recipient): void
    {
        $declined = DB::transaction(function () use ($invitation): bool {
            /** @var ResourceInvitation $locked */
            $locked = ResourceInvitation::query()
                ->whereKey($invitation->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->markExpiredIfNeeded($locked);

            if (! $locked->isPendingAndUnexpired()) {
                return false;
            }

            $locked->update([
                'status' => ResourceInvitationStatus::DECLINED,
                'declined_at' => now(),
            ]);

            return true;
        });

        if (! $declined) {
            throw new RuntimeException('no_longer_valid');
        }
    }

    public function revoke(ResourceInvitation $invitation): void
    {
        $revoked = DB::transaction(function () use ($invitation): bool {
            /** @var ResourceInvitation $locked */
            $locked = ResourceInvitation::query()
                ->whereKey($invitation->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->markExpiredIfNeeded($locked);

            if (! $locked->isPendingAndUnexpired()) {
                return false;
            }

            $this->markRevoked($locked);

            return true;
        });

        if (! $revoked) {
            throw new RuntimeException('no_longer_valid');
        }
    }

    /**
     * Revoke pending invitations issued by a user for a target when they lose grant authority.
     */
    public function revokePendingIssuedByForTarget(
        ResourceInvitationType $type,
        User $inviter,
        mixed $target,
    ): int {
        $handler = $this->handlerFor($type);
        $query = ResourceInvitation::query()
            ->ofType($type)
            ->pending()
            ->where('invited_by_user_id', $inviter->id);

        $invitationIds = $handler->scopeForTarget($query, $target)->pluck('id');

        if ($invitationIds->isEmpty()) {
            return 0;
        }

        return ResourceInvitation::query()
            ->whereIn('id', $invitationIds)
            ->update([
                'status' => ResourceInvitationStatus::REVOKED,
                'revoked_at' => now(),
            ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializePendingList(ResourceInvitationType $type, Collection $invitations): array
    {
        $handler = $this->handlerFor($type);

        /** @var list<array<string, mixed>> $serialized */
        $serialized = [];

        foreach ($invitations as $invitation) {
            if (! $invitation instanceof ResourceInvitation) {
                continue;
            }

            $serialized[] = $handler->serializeForManager($invitation);
        }

        return $serialized;
    }

    private function ttlFor(ResourceInvitationType $type): string
    {
        /** @var string $ttl */
        $ttl = config('resource_invitations.ttl.'.$type->value, '1 hour');

        return $ttl;
    }

    private function markExpiredIfNeeded(ResourceInvitation $invitation): void
    {
        if (
            $invitation->status === ResourceInvitationStatus::PENDING
            && $invitation->expires_at->isPast()
        ) {
            $invitation->update([
                'status' => ResourceInvitationStatus::EXPIRED,
            ]);
            $invitation->refresh();
        }
    }

    private function markRevoked(ResourceInvitation $invitation): void
    {
        $invitation->update([
            'status' => ResourceInvitationStatus::REVOKED,
            'revoked_at' => now(),
        ]);
    }
}
