<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Enums\PlacementResponseStatus;
use App\Models\Chat;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Resolves the single `chat_id` a placement request exposes to one viewer.
 *
 * This was the third thing duplicated between PlacementRequestResource and
 * GetPlacementRequestViewerContextController, after the viewer role and the
 * available actions. Both copies resolved a two-party chat by counterparty,
 * which cannot express "the responder is talking to a rescue".
 */
class PlacementChatLocator
{
    public function findChatId(?User $user, PlacementRequest $placementRequest, string $viewerRole): ?int
    {
        if (! $user instanceof User) {
            return null;
        }

        if ($placementRequest->isGroupHeld()) {
            return $this->groupChatId($user, $placementRequest);
        }

        return $this->directChatId($user, $placementRequest, $viewerRole);
    }

    /**
     * A group listing has one thread per responder, so the viewer's own
     * participation is what identifies theirs. For a rescue-side viewer, who may
     * be in several, prefer the thread with the responder they accepted.
     */
    private function groupChatId(User $user, PlacementRequest $placementRequest): ?int
    {
        $mine = fn (): Builder => Chat::query()
            ->where('type', ChatType::PRIVATE_GROUP)
            ->where('contextable_type', ContextableType::PLACEMENT_REQUEST)
            ->where('contextable_id', $placementRequest->id)
            ->whereHas('activeParticipants', fn ($query) => $query->where('user_id', $user->id));

        $acceptedResponderId = $this->acceptedResponderId($placementRequest);

        if ($acceptedResponderId !== null) {
            $withAccepted = $mine()
                ->whereHas('activeParticipants', fn ($query) => $query->where('user_id', $acceptedResponderId))
                ->orderBy('id')
                ->value('id');

            if ($withAccepted !== null) {
                return (int) $withAccepted;
            }
        }

        $chatId = $mine()->orderBy('id')->value('id');

        return $chatId === null ? null : (int) $chatId;
    }

    private function directChatId(User $user, PlacementRequest $placementRequest, string $viewerRole): ?int
    {
        $counterpartyId = match ($viewerRole) {
            'owner' => $this->acceptedResponderId($placementRequest),
            'helper' => $placementRequest->user_id === null ? null : (int) $placementRequest->user_id,
            default => null,
        };

        if ($counterpartyId === null) {
            return null;
        }

        $chatId = Chat::query()
            ->where('contextable_type', ContextableType::PLACEMENT_REQUEST)
            ->where('contextable_id', $placementRequest->id)
            ->whereHas('activeParticipants', fn ($query) => $query->where('user_id', $user->id))
            ->whereHas('activeParticipants', fn ($query) => $query->where('user_id', $counterpartyId))
            ->value('id');

        return $chatId === null ? null : (int) $chatId;
    }

    private function acceptedResponderId(PlacementRequest $placementRequest): ?int
    {
        $placementRequest->loadMissing('responses.helperProfile');

        $accepted = $placementRequest->responses
            ->first(fn ($response): bool => $response->status === PlacementResponseStatus::ACCEPTED);

        $userId = $accepted?->helperProfile?->user_id;

        return $userId === null ? null : (int) $userId;
    }
}
