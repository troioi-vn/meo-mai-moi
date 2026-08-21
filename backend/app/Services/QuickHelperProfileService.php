<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\HelperProfileCreatedVia;
use App\Enums\HelperProfileStatus;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Gets a user a helper profile so they can answer a placement request, without
 * making them fill in the form first.
 *
 * Someone standing in a rescue who has already met the animal should not have to
 * complete a profile before saying "I'll take them". The response still needs a
 * HelperProfile behind it — placement_request_responses.helper_profile_id is NOT
 * NULL, and TransferRequest derives its recipient from the profile's user — so
 * this creates the smallest row the schema will accept and lets the user fill in
 * the rest later, if they ever want to.
 */
class QuickHelperProfileService
{
    /**
     * Return the user's existing active profile, or create a minimal one seeded
     * from the request they are answering.
     *
     * Never creates a second profile for a user who already has one, which is
     * what makes a replayed request harmless at this layer.
     */
    public function resolveForRequest(
        User $user,
        PlacementRequest $placementRequest,
        ?string $phoneNumber = null,
    ): HelperProfile {
        $existing = $user->helperProfiles()->active()->first();

        if ($existing instanceof HelperProfile) {
            return $existing;
        }

        return DB::transaction(function () use ($user, $placementRequest, $phoneNumber): HelperProfile {
            $pet = $placementRequest->pet;

            $profile = HelperProfile::create([
                'user_id' => $user->id,
                // Seeded from the pet: the helper is answering this specific
                // animal in this specific place, so that is what we know.
                'country' => $pet->country,
                'city_id' => $pet->city_id,
                'city' => is_string($pet->city) ? $pet->city : null,
                'phone_number' => $phoneNumber ?? '',
                // NOT NULL with no default, and we have not asked. The saving hook
                // on HelperProfile nulls experience_locale for blank input.
                'experience' => '',
                // The schema has no tri-state, so these record false for a question
                // the user was never asked. created_via is what lets owner-facing
                // surfaces render them as "not stated" instead of "No".
                'has_pets' => false,
                'has_children' => false,
                'request_types' => [$placementRequest->request_type->value],
                'status' => HelperProfileStatus::PRIVATE,
                'created_via' => HelperProfileCreatedVia::QUICK_RESPONSE,
            ]);

            if ($pet->city_id !== null) {
                $profile->cities()->sync([$pet->city_id]);
            }

            return $profile;
        });
    }
}
