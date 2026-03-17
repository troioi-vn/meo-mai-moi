<?php

declare(strict_types=1);

namespace App\Services\PetCapability;

use App\Models\Pet;
use Illuminate\Validation\ValidationException;

final class CapabilityValidator
{
    private CapabilityChecker $checker;

    public function __construct(?CapabilityChecker $checker = null)
    {
        $this->checker = $checker ?? new CapabilityChecker;
    }

    /**
     * Ensure a pet supports a capability, throw ValidationException if not.
     */
    public function ensure(Pet $pet, string $capability): void
    {
        if (! $this->checker->supports($pet, $capability)) {
            $this->throwCapabilityException();
        }
    }

    private function throwCapabilityException(): void
    {
        $messages = [
            'pet_type' => ['Feature not available for this pet type'],
        ];

        $exception = ValidationException::withMessages($messages);

        $exception->response = response()->json([
            'message' => 'The given data was invalid.',
            'error_code' => 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE',
            'errors' => $messages,
        ], 422);

        throw $exception;
    }
}
