<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LitterGroupFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function createPetType(string $name, string $slug): PetType
    {
        return PetType::create([
            'name' => $name,
            'slug' => $slug,
            'is_system' => true,
            'display_order' => 0,
            'supports_litters' => true,
        ]);
    }

    private function makeGroupWithAdmin(User $admin, string $name = 'Test Group'): Group
    {
        $group = Group::factory()->create([
            'name' => $name,
            'created_by_user_id' => $admin->id,
        ]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        return $group;
    }

    #[Test]
    public function group_admin_creates_litter_into_group_attaches_all_pets(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $admin = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'group_id' => $group->id,
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
                ['sex' => 'female'],
            ],
        ]);

        $response->assertStatus(201);
        $litterId = $response->json('data.id');
        $pets = $response->json('data.pets');
        $this->assertCount(3, $pets);

        foreach ($pets as $petData) {
            $this->assertDatabaseHas('group_pets', [
                'group_id' => $group->id,
                'pet_id' => $petData['id'],
                'end_at' => null,
            ]);
            $this->assertDatabaseHas('pets', [
                'id' => $petData['id'],
                'litter_id' => $litterId,
            ]);
        }

        $this->assertDatabaseHas('litters', ['id' => $litterId]);
    }

    #[Test]
    public function another_group_member_can_view_group_litter(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($admin);
        $litterId = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'group_id' => $group->id,
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
            ],
        ])->assertStatus(201)->json('data.id');

        Sanctum::actingAs($member);
        $response = $this->getJson("/api/litters/{$litterId}");
        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $litterId);
        $this->assertCount(2, $response->json('data.pets'));
    }

    #[Test]
    public function group_admin_can_edit_pets_from_group_litter(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $owner = User::factory()->create();
        $otherAdmin = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $otherAdmin->id,
        ]);

        Sanctum::actingAs($owner);
        $litterData = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'group_id' => $group->id,
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
            ],
        ])->assertStatus(201)->json('data');
        $petId = $litterData['pets'][0]['id'];

        // other admin should be able to edit via group access
        Sanctum::actingAs($otherAdmin);
        $this->putJson("/api/pets/{$petId}", ['name' => 'Updated By Group Admin'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated By Group Admin');

        $this->assertDatabaseHas('pets', ['id' => $petId, 'name' => 'Updated By Group Admin']);
    }

    #[Test]
    public function non_admin_member_is_refused_and_nothing_is_created(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($member);

        $initialLitters = Litter::count();
        $initialPets = Pet::count();
        $initialGroupPets = GroupPet::count();

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'group_id' => $group->id,
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
            ],
        ]);

        $response->assertStatus(403);
        $this->assertEquals($initialLitters, Litter::count());
        $this->assertEquals($initialPets, Pet::count());
        $this->assertEquals($initialGroupPets, GroupPet::count());
    }

    #[Test]
    public function creating_litter_without_group_still_works(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
            ],
        ]);

        $response->assertStatus(201);
        $pets = $response->json('data.pets');
        $this->assertCount(2, $pets);

        foreach ($pets as $petData) {
            $this->assertDatabaseMissing('group_pets', [
                'pet_id' => $petData['id'],
                'end_at' => null,
            ]);
        }
    }

    #[Test]
    public function group_id_validation_rejects_non_integer(): void
    {
        $cat = $this->createPetType('Cat', 'cat');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'group_id' => 'not-a-number',
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['group_id']);
        $this->assertEquals(0, Litter::count());
        $this->assertEquals(0, Pet::count());
    }
}
