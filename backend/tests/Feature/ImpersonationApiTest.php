<?php

namespace Tests\Feature;

use App\Models\User;
use Lab404\Impersonate\Services\ImpersonateManager;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ImpersonationApiTest extends TestCase
{
    #[Test]
    public function impersonated_session_returns_impersonated_profile_and_pets(): void
    {
        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);
        $impersonatedUser = User::factory()->create([
            'name' => 'Impersonated User',
            'email' => 'member@example.com',
        ]);

        $adminPet = $this->createPetWithOwner($admin, ['name' => 'Admin Cat']);
        $impersonatedPet = $this->createPetWithOwner($impersonatedUser, ['name' => 'Member Cat']);

        $this->actingAs($admin, 'web');

        $manager = app(ImpersonateManager::class);
        $this->assertTrue($manager->take($admin, $impersonatedUser, 'web'));

        $profileResponse = $this->getJson('/api/users/me');

        $profileResponse->assertOk()
            ->assertJsonPath('data.id', $impersonatedUser->id)
            ->assertJsonPath('data.name', 'Impersonated User')
            ->assertJsonPath('data.email', 'member@example.com');

        $petsResponse = $this->getJson('/api/my-pets/sections');

        $petsResponse->assertOk()
            ->assertJsonPath('data.owned.0.id', $impersonatedPet->id)
            ->assertJsonPath('data.owned.0.name', 'Member Cat');

        $ownedPetIds = collect($petsResponse->json('data.owned'))->pluck('id');

        $this->assertTrue($ownedPetIds->contains($impersonatedPet->id));
        $this->assertFalse($ownedPetIds->contains($adminPet->id));
    }
}
