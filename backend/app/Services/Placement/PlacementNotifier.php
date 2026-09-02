<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\PetRelationshipType;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Collection;

/**
 * Fans an owner-side placement event out to everyone entitled to act on it.
 *
 * Before Groups this was always one person, so both call sites simply notified
 * `$placementRequest->user`. A rescue has many volunteers who can all act, and
 * they all need to see a response arrive - but mailing twenty people every time
 * someone applies for a cat is how an app gets filtered to spam. So everyone
 * gets the in-app notification and only the people accountable for the listing,
 * the creator and the group admins, get the email.
 *
 * There is deliberately no per-group mute yet: NotificationPreference is keyed
 * on (user, type) only. That is the first thing to add if volunteers complain.
 */
class PlacementNotifier
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifyOwnerSide(PlacementRequest $placementRequest, string $type, array $data): void
    {
        $audience = $this->audienceFor($placementRequest);

        foreach ($audience['full'] as $user) {
            $this->notificationService->send($user, $type, $data);
        }

        foreach ($audience['in_app_only'] as $user) {
            $this->notificationService->sendInApp($user, $type, $data);
        }
    }

    /**
     * In-app only, for the whole audience.
     *
     * Public questions arrive from strangers and arrive in bursts, so mailing
     * every volunteer the moment one lands is the exact behaviour this class
     * was written to avoid. Everyone entitled to act sees the bell immediately;
     * the email side is batched by placement-questions:send-digest-emails.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyOwnerSideInApp(PlacementRequest $placementRequest, string $type, array $data): void
    {
        $audience = $this->audienceFor($placementRequest);

        foreach ([...$audience['full'], ...$audience['in_app_only']] as $user) {
            $this->notificationService->sendInApp($user, $type, $data);
        }
    }

    /**
     * The people entitled to act on this listing, for callers that need the
     * audience itself rather than a send. Used by the question digest, which
     * has to decide who still has something unanswered waiting.
     *
     * @return Collection<int, User>
     */
    public function accountableFor(PlacementRequest $placementRequest): Collection
    {
        return $this->audienceFor($placementRequest)['full'];
    }

    /**
     * Two disjoint sets, so nobody is notified twice for being owner, creator
     * and admin at once.
     *
     * `full` goes through send(), which still honours each recipient's stored
     * channel preferences. `in_app_only` never reaches email or Telegram.
     *
     * @return array{full: Collection<int, User>, in_app_only: Collection<int, User>}
     */
    private function audienceFor(PlacementRequest $placementRequest): array
    {
        $creatorId = $placementRequest->user_id === null ? null : (int) $placementRequest->user_id;

        $groupIds = GroupPet::query()
            ->where('pet_id', $placementRequest->pet_id)
            ->active()
            ->whereHas('group', fn ($query) => $query->whereNull('deleted_at'))
            ->pluck('group_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->all();

        if ($groupIds === []) {
            // A personal pet behaves exactly as it did before Groups existed:
            // one recipient, full treatment.
            return [
                'full' => $this->hydrate($creatorId === null ? [] : [$creatorId]),
                'in_app_only' => collect(),
            ];
        }

        $memberships = GroupMembership::query()
            ->whereIn('group_id', $groupIds)
            ->active()
            ->get(['user_id', 'role']);

        $ownerIds = PetRelationship::query()
            ->where('pet_id', $placementRequest->pet_id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNull('end_at')
            ->pluck('user_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $adminIds = $memberships
            ->filter(static fn (GroupMembership $membership): bool => $membership->isAdmin())
            ->pluck('user_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $memberIds = $memberships
            ->pluck('user_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $fullIds = array_values(array_unique(
            [...$adminIds, ...($creatorId === null ? [] : [$creatorId])]
        ));

        $inAppOnlyIds = array_values(array_diff(
            array_unique([...$memberIds, ...$ownerIds]),
            $fullIds
        ));

        return [
            'full' => $this->hydrate($fullIds),
            'in_app_only' => $this->hydrate($inAppOnlyIds),
        ];
    }

    /**
     * One query for the whole audience rather than one per recipient, so a
     * rescue with many volunteers does not turn each response into a query storm.
     *
     * @param  list<int>  $userIds
     * @return Collection<int, User>
     */
    private function hydrate(array $userIds): Collection
    {
        if ($userIds === []) {
            return collect();
        }

        /** @var Collection<int, User> $users */
        $users = User::query()->whereIn('id', $userIds)->get();

        return $users;
    }
}
