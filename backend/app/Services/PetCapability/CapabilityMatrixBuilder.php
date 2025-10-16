<?php

namespace App\Services\PetCapability;

use App\Models\PetType;

class CapabilityMatrixBuilder
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
     * Get all capabilities for a pet type slug.
     */
    public function getCapabilities(string $petTypeSlug): array
    {
        $capabilities = $this->getStaticCapabilities($petTypeSlug);
        $capabilities = array_merge($capabilities, $this->getDynamicCapabilities($petTypeSlug));

        return $capabilities;
    }

    /**
     * Get the capability matrix (for frontend config generation).
     */
    public function getCapabilityMatrix(): array
    {
        $matrix = self::STATIC_CAPABILITIES;
        $matrix = array_merge($matrix, $this->getDynamicCapabilityMatrix());

        return $matrix;
    }

    private function getStaticCapabilities(string $petTypeSlug): array
    {
        $capabilities = [];

        foreach (self::STATIC_CAPABILITIES as $capability => $allowedTypes) {
            $capabilities[$capability] = in_array($petTypeSlug, $allowedTypes);
        }

        return $capabilities;
    }

    private function getDynamicCapabilities(string $petTypeSlug): array
    {
        $petType = PetType::where('slug', $petTypeSlug)->first();

        if (! $petType) {
            return [
                'placement' => false,
                'weight' => false,
                'microchips' => false,
            ];
        }

        return [
            'placement' => $petType->placement_requests_allowed,
            'weight' => (bool) $petType->weight_tracking_allowed,
            'microchips' => (bool) $petType->microchips_allowed,
        ];
    }

    private function getDynamicCapabilityMatrix(): array
    {
        return [
            'placement' => PetType::where('placement_requests_allowed', true)->pluck('slug')->toArray(),
            'weight' => PetType::where('weight_tracking_allowed', true)->pluck('slug')->toArray(),
            'microchips' => PetType::where('microchips_allowed', true)->pluck('slug')->toArray(),
        ];
    }
}
