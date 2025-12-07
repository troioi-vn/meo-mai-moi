<?php

namespace App\Services;

use App\Models\Pet;
use App\Services\PetCapability\CapabilityChecker;
use App\Services\PetCapability\CapabilityMatrixBuilder;
use App\Services\PetCapability\CapabilityValidator;

class PetCapabilityService
{
    private static ?CapabilityChecker $checker = null;

    private static ?CapabilityValidator $validator = null;

    private static ?CapabilityMatrixBuilder $matrixBuilder = null;

    /**
     * Check if a pet supports a specific capability
     */
    public static function supports(Pet $pet, string $capability): bool
    {
        return self::getChecker()->supports($pet, $capability);
    }

    /**
     * Ensure a pet supports a capability, throw ValidationException if not
     */
    public static function ensure(Pet $pet, string $capability): void
    {
        self::getValidator()->ensure($pet, $capability);
    }

    /**
     * Get all capabilities for a pet type slug
     */
    public static function getCapabilities(string $petTypeSlug): array
    {
        return self::getMatrixBuilder()->getCapabilities($petTypeSlug);
    }

    /**
     * Get the capability matrix (for frontend config generation)
     */
    public static function getCapabilityMatrix(): array
    {
        return self::getMatrixBuilder()->getCapabilityMatrix();
    }

    private static function getChecker(): CapabilityChecker
    {
        return self::$checker ??= new CapabilityChecker();
    }

    private static function getValidator(): CapabilityValidator
    {
        return self::$validator ??= new CapabilityValidator();
    }

    private static function getMatrixBuilder(): CapabilityMatrixBuilder
    {
        return self::$matrixBuilder ??= new CapabilityMatrixBuilder();
    }
}
