<?php

namespace Tests;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\File;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Set the base URL for tests
        $this->app['config']['app.url'] = 'http://laravel.test';
        $this->app['config']['app.asset_url'] = 'http://laravel.test';

        // Disable email verification requirement by default for Feature tests only
        // to avoid 403 responses from middleware on routes that don't specifically test it.
        // Unit tests should observe the real default (true) unless they override it explicitly.
        $isFeatureTest = str_starts_with(static::class, 'Tests\\Feature\\');
        if ($isFeatureTest) {
            Settings::set('email_verification_required', 'false');
        }

        // Ensure Sanctum treats our test host as stateful so session-based
        // actingAs() works with routes guarded by auth:sanctum.
        $this->app['config']['sanctum.stateful'] = [
            'laravel.test',
            'localhost',
            'localhost:5173',
            '127.0.0.1',
            '127.0.0.1:8000',
            '::1',
        ];
        // Keep session domain unset in tests to use host-only cookies.
        $this->app['config']['session.domain'] = null;
    }

    protected function tearDown(): void
    {
        // Spatie MediaLibrary uses storage_path('media-library/temp') by default.
        // In tests we also point it at storage/framework/testing/media-library/temp.
        // Either way, clean up so the repo doesn't accumulate temp artifacts.
        File::deleteDirectory(storage_path('framework/testing/media-library'));
        File::deleteDirectory(storage_path('media-library'));

        parent::tearDown();
    }

    /**
     * Helper method to create a pet with owner relationship
     * Replaces the old $this->createPetWithOwner($owner) pattern
     */
    protected function createPetWithOwner(User $owner, array $attributes = []): Pet
    {
        $attributes['created_by'] = $owner->id;

        $pet = Pet::factory()->create($attributes);

        // Verify ownership relationship was created
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::OWNER->value,
            'end_at' => null,
        ]);

        return $pet;
    }

    /**
     * Assert pet ownership using new relationship system
     * Replaces: $this->assertPetOwnedBy($pet, $user)
     */
    protected function assertPetOwnedBy(Pet $pet, User $user): void
    {
        $this->assertTrue($pet->isOwnedBy($user), "Pet {$pet->id} should be owned by user {$user->id}");
    }

    /**
     * Assert pet editing permissions using new relationship system
     * Replaces: $this->assertTrue($pet->isOwnedBy($user) || $pet->editors->contains($user))
     */
    protected function assertPetEditableBy(Pet $pet, User $user): void
    {
        $this->assertTrue($pet->canBeEditedBy($user), "Pet {$pet->id} should be editable by user {$user->id}");
    }

    /**
     * Assert pet viewing permissions using new relationship system
     */
    protected function assertPetViewableBy(Pet $pet, User $user): void
    {
        $this->assertTrue($pet->canBeViewedBy($user), "Pet {$pet->id} should be viewable by user {$user->id}");
    }

    /**
     * Assert pet is NOT owned by user
     * Replaces: $this->assertPetNotOwnedBy($pet, $user)
     */
    protected function assertPetNotOwnedBy(Pet $pet, User $user): void
    {
        $this->assertFalse($pet->isOwnedBy($user), "Pet {$pet->id} should NOT be owned by user {$user->id}");
    }
}
