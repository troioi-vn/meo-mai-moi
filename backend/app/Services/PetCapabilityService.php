<?php

namespace App\Services;

use App\Models\Pet;
use App\Models\PetType;
use Illuminate\Validation\ValidationException;

class PetCapabilityService
{
    /**
     * Capability matrix mapping capabilities to allowed pet type slugs
     */
    private const CAPABILITIES = [
        'fostering' => ['cat'],
        'medical' => ['cat'],
        'vaccinations' => ['cat'],
        'ownership' => ['cat'],
        // 'weight' is dynamic per pet type; handled specially below
        // 'microchips' is dynamic per pet type; handled specially below
        'comments' => ['cat'],
        'status_update' => ['cat'],
        'photos' => ['cat', 'dog'], // Photos allowed for all pet types
    ];

    /**
     * Check if a pet supports a specific capability
     */
    public static function supports(Pet $pet, string $capability): bool
    {
        // Load pet type if not already loaded
        if (! $pet->relationLoaded('petType')) {
            $pet->load('petType');
        }

        if ($capability === 'placement') {
            return $pet->petType->placement_requests_allowed;
        }

        if ($capability === 'weight') {
            return (bool) ($pet->petType->weight_tracking_allowed ?? false);
        }

        if ($capability === 'microchips') {
            return (bool) ($pet->petType->microchips_allowed ?? false);
        }

        $allowedTypes = self::CAPABILITIES[$capability] ?? [];
        return in_array($pet->petType->slug, $allowedTypes);
    }

    /**
     * Ensure a pet supports a capability, throw ValidationException if not
     */
    public static function ensure(Pet $pet, string $capability): void
    {
        if (! self::supports($pet, $capability)) {
            $messages = [
                'pet_type' => ['Feature not available for this pet type'],
            ];
            $ex = ValidationException::withMessages($messages);
            // Provide custom JSON response including a machine-readable error_code
            $ex->response = response()->json([
                'message' => 'The given data was invalid.',
                'error_code' => 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE',
                'errors' => $messages,
            ], 422);
            throw $ex;
        }
    }

    /**
     * Get all capabilities for a pet type slug
     */
    public static function getCapabilities(string $petTypeSlug): array
    {
        $capabilities = [];

        foreach (self::CAPABILITIES as $capability => $allowedTypes) {
            $capabilities[$capability] = in_array($petTypeSlug, $allowedTypes);
        }

        $petType = PetType::where('slug', $petTypeSlug)->first();
        $capabilities['placement'] = $petType ? $petType->placement_requests_allowed : false;
        $capabilities['weight'] = $petType ? (bool) $petType->weight_tracking_allowed : false;
        $capabilities['microchips'] = $petType ? (bool) $petType->microchips_allowed : false;

        return $capabilities;
    }

    /**
     * Get the capability matrix (for frontend config generation)
     */
    public static function getCapabilityMatrix(): array
    {
        $matrix = self::CAPABILITIES;
        // Placement is now dynamic, so we add it here for the frontend.
        $matrix['placement'] = PetType::where('placement_requests_allowed', true)->pluck('slug')->toArray();
        $matrix['weight'] = PetType::where('weight_tracking_allowed', true)->pluck('slug')->toArray();
        $matrix['microchips'] = PetType::where('microchips_allowed', true)->pluck('slug')->toArray();

        return $matrix;
    }
}
