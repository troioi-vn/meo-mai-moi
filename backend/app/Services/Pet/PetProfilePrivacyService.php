<?php

declare(strict_types=1);

namespace App\Services\Pet;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\PetAccessService;
use App\Services\Placement\PlacementViewerRoleService;

/**
 * Redacts applicant and member PII from pet-detail payloads.
 *
 * Both public pet-detail endpoints are anonymous surfaces
 * (`optional.auth`), so the raw `User` / `HelperProfile` serialization
 * (which carries email, telegram identifiers, google_id, phone numbers,
 * contact details and addresses) must be shaped by viewer before it is
 * returned. Privileged viewers — the pet's owner/editor or the placement
 * request's creator — receive the payload exactly as serialized, so the
 * owner-facing data stays byte-identical. Everyone else sees at most
 * `{id, name}` for a nested user (with the responder name nulled unless
 * they created the request) and no contact fields on helper profiles.
 *
 * Lists are never filtered, only shaped, so relationship/response counts
 * and key shapes stay stable for clients.
 */
class PetProfilePrivacyService
{
    /**
     * User keys visible to non-privileged viewers. Everything else on the
     * nested user (email, telegram_*, google_id, ...) is dropped.
     *
     * @var list<string>
     */
    private const SAFE_USER_KEYS = ['id', 'name'];

    /**
     * Helper-profile contact fields nulled for non-privileged viewers.
     * Keys stay present (as null) so client shapes do not change.
     *
     * @var list<string>
     */
    private const REDACTED_HELPER_PROFILE_KEYS = [
        'phone_number',
        'contact_details',
        'address',
        'zip_code',
    ];

    public function __construct(
        private readonly PetAccessService $petAccess,
        private readonly PlacementViewerRoleService $viewerRoles,
    ) {}

    /**
     * Redact a `$pet->toArray()` payload in full (relationships plus every
     * placement request). Returns the input untouched for viewers who may
     * see contact details, keeping the owner-facing payload byte-identical.
     *
     * @param  array<string, mixed>  $petData
     * @return array<string, mixed>
     */
    public function redactPetArray(array $petData, ?User $viewer, Pet $pet): array
    {
        if (isset($petData['relationships']) && is_array($petData['relationships'])) {
            $canSeeMembers = $viewer instanceof User && $this->petAccess->canEdit($viewer, $pet);
            foreach ($petData['relationships'] as &$relationship) {
                if (! is_array($relationship) || ! isset($relationship['user']) || ! is_array($relationship['user'])) {
                    continue;
                }
                if (! $canSeeMembers) {
                    // Member names stay visible; every other user field is dropped.
                    $relationship['user'] = $this->redactUser($relationship['user'], hideName: false);
                }
            }
            unset($relationship);
        }

        if (isset($petData['placement_requests']) && is_array($petData['placement_requests'])) {
            $requestsById = $pet->placementRequests->keyBy('id');
            foreach ($petData['placement_requests'] as &$requestData) {
                if (! is_array($requestData)) {
                    continue;
                }
                $request = $requestsById->get($requestData['id'] ?? null);
                if (! $request instanceof PlacementRequest) {
                    continue;
                }
                $requestData = $this->redactPlacementRequestArray($requestData, $request, $viewer, $pet);
            }
            unset($requestData);
        }

        return $petData;
    }

    /**
     * Redact one placement-request array (from `$placementRequest->toArray()`).
     *
     * @param  array<string, mixed>  $requestData
     * @return array<string, mixed>
     */
    public function redactPlacementRequestArray(array $requestData, PlacementRequest $request, ?User $viewer, Pet $pet): array
    {
        if ($this->isPrivilegedForRequest($viewer, $pet, $request)) {
            return $requestData;
        }

        $responses = $requestData['responses'] ?? null;
        if (! is_array($responses)) {
            return $requestData;
        }

        $redacted = [];
        foreach ($responses as $response) {
            if (! is_array($response)) {
                continue;
            }
            if (isset($response['helper_profile']) && is_array($response['helper_profile'])) {
                $response['helper_profile'] = $this->redactHelperProfile($response['helper_profile']);
            }
            $redacted[] = $response;
        }
        $requestData['responses'] = $redacted;

        return $requestData;
    }

    private function isPrivilegedForRequest(?User $viewer, Pet $pet, PlacementRequest $request): bool
    {
        if (! $viewer instanceof User) {
            return false;
        }

        // The pet's owner/editor (direct or via Group) sees applicant details.
        if ($this->petAccess->canEdit($viewer, $pet)) {
            return true;
        }

        // Whoever created the request sees responder names and contacts.
        if ($viewer->id === $request->user_id) {
            return true;
        }

        // Same role key the PlacementRequestResource shapes its own surface by.
        return $this->viewerRoles->determine($viewer, $request) === 'owner';
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return array<string, mixed>
     */
    private function redactHelperProfile(array $profile): array
    {
        foreach (self::REDACTED_HELPER_PROFILE_KEYS as $key) {
            if (array_key_exists($key, $profile)) {
                $profile[$key] = null;
            }
        }

        if (isset($profile['user']) && is_array($profile['user'])) {
            // Keep shape stable for clients while redacting personally identifiable data.
            $profile['user'] = $this->redactUser($profile['user'], hideName: true);
        }

        return $profile;
    }

    /**
     * @param  array<string, mixed>  $userData
     * @return array{id: mixed, name: mixed}
     */
    private function redactUser(array $userData, bool $hideName): array
    {
        $safe = array_intersect_key($userData, array_flip(self::SAFE_USER_KEYS));

        return [
            'id' => $safe['id'] ?? null,
            'name' => $hideName ? null : ($safe['name'] ?? null),
        ];
    }
}
