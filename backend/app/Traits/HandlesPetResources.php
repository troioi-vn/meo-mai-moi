<?php

namespace App\Traits;

use App\Models\Pet;
use App\Services\PetCapabilityService;
use Illuminate\Http\Request;

trait HandlesPetResources
{
    /**
     * Ensure a resource belongs to the specified pet.
     */
    protected function ensureResourceBelongsToPet($resource, Pet $pet, string $foreignKey = 'pet_id'): void
    {
        if ($resource->{$foreignKey} !== $pet->id) {
            abort(404, 'Resource not found for this pet.');
        }
    }

    /**
     * Ensure pet has the required capability.
     */
    protected function ensurePetCapability(Pet $pet, string $capability): void
    {
        PetCapabilityService::ensure($pet, $capability);
    }

    /**
     * Validate pet resource ownership and capability in one call.
     */
    protected function validatePetResource(Request $request, Pet $pet, string $capability, $resource = null, string $foreignKey = 'pet_id'): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        // Require owner or admin access
        $user = $this->requireOwnerOrAdmin($request, $pet);
        
        // Check capability
        $this->ensurePetCapability($pet, $capability);
        
        // Validate resource belongs to pet if provided
        if ($resource) {
            $this->ensureResourceBelongsToPet($resource, $pet, $foreignKey);
        }
        
        return $user;
    }

    /**
     * Create paginated response with consistent format.
     */
    protected function paginatedResponse($items, array $additionalData = []): array
    {
        $response = [
            'data' => $items->items(),
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $items->currentPage(),
                'from' => $items->firstItem(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'to' => $items->lastItem(),
                'total' => $items->total(),
            ],
        ];

        return array_merge($response, $additionalData);
    }

    /**
     * Validate request with consistent error handling.
     */
    protected function validateRequest(Request $request, array $rules, array $messages = []): array
    {
        try {
            return $request->validate($rules, $messages);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Re-throw with consistent format
            throw $e;
        }
    }

    /**
     * Check if pet is in valid status for operations.
     */
    protected function ensurePetIsActive(Pet $pet): void
    {
        if ($pet->status !== \App\Enums\PetStatus::ACTIVE) {
            abort(403, 'Pet is not available for this operation.');
        }
    }

    /**
     * Load common pet relationships.
     */
    protected function loadPetRelationships(Pet $pet, array $relationships = ['petType']): Pet
    {
        return $pet->load($relationships);
    }
}