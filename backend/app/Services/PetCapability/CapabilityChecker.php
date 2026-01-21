<?php

declare(strict_types=1);

namespace App\Services\PetCapability;

use App\Models\Pet;

class CapabilityChecker
{
    private const STATIC_CAPABILITIES = [
        'fostering' => ['cat'],
        'medical' => ['cat'],
        'vaccinations' => ['cat'],
        'ownership' => ['cat'],
        'comments' => ['cat'],
        'status_update' => ['cat'],
        'photos' => ['cat', 'dog'],
    ];

    /**
     * Check if a pet supports a specific capability.
     */
    public function supports(Pet $pet, string $capability): bool
    {
        $this->ensurePetTypeLoaded($pet);

        return match ($capability) {
            'placement' => $this->supportsPlacement($pet),
            'weight' => $this->supportsWeight($pet),
            'microchips' => $this->supportsMicrochips($pet),
            default => $this->supportsStaticCapability($pet, $capability),
        };
    }

    private function ensurePetTypeLoaded(Pet $pet): void
    {
        if (! $pet->relationLoaded('petType')) {
            $pet->load('petType');
        }
    }

    private function supportsPlacement(Pet $pet): bool
    {
        return $pet->petType->placement_requests_allowed;
    }

    private function supportsWeight(Pet $pet): bool
    {
        return (bool) ($pet->petType->weight_tracking_allowed ?? false);
    }

    private function supportsMicrochips(Pet $pet): bool
    {
        return (bool) ($pet->petType->microchips_allowed ?? false);
    }

    private function supportsStaticCapability(Pet $pet, string $capability): bool
    {
        $allowedTypes = self::STATIC_CAPABILITIES[$capability] ?? [];

        return in_array($pet->petType->slug, $allowedTypes);
    }
}
