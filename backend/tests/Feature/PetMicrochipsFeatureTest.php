<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PetMicrochipsFeatureTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Pet $pet;

    private User $admin;

    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles first
        Role::firstOrCreate(['name' => 'pet_owner']);
        Role::firstOrCreate(['name' => 'admin']);

        $this->owner = User::factory()->create();
        $this->owner->assignRole('pet_owner');

        $this->pet = Pet::factory()->create([
            'user_id' => $this->owner->id,
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->otherUser = User::factory()->create();
        $this->otherUser->assignRole('pet_owner');
    }

    #[Test]
    public function owner_can_list_pet_microchips()
    {
        PetMicrochip::factory()->count(3)->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->owner)
            ->getJson("/api/pets/{$this->pet->id}/microchips");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'data' => [
                        '*' => ['id', 'pet_id', 'chip_number', 'issuer', 'implanted_at', 'created_at', 'updated_at'],
                    ],
                    'links',
                    'meta',
                ],
            ])
            ->assertJsonCount(3, 'data.data');
    }

    #[Test]
    public function admin_can_list_pet_microchips()
    {
        PetMicrochip::factory()->count(2)->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/pets/{$this->pet->id}/microchips");

        $response->assertOk()
            ->assertJsonCount(2, 'data.data');
    }

    #[Test]
    public function other_users_cannot_list_pet_microchips()
    {
        PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->otherUser)
            ->getJson("/api/pets/{$this->pet->id}/microchips");

        $response->assertForbidden();
    }

    #[Test]
    public function guests_cannot_list_pet_microchips()
    {
        $response = $this->getJson("/api/pets/{$this->pet->id}/microchips");

        $response->assertUnauthorized();
    }

    #[Test]
    public function owner_can_create_microchip_record()
    {
        $data = [
            'chip_number' => '982000123456789',
            'issuer' => 'HomeAgain',
            'implanted_at' => '2024-01-15',
        ];

        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", $data);

        $response->assertCreated()
            ->assertJsonFragment([
                'chip_number' => '982000123456789',
                'issuer' => 'HomeAgain',
            ])
            ->assertJsonPath('data.pet_id', $this->pet->id)
            ->assertJsonPath('data.chip_number', '982000123456789')
            ->assertJsonPath('data.issuer', 'HomeAgain');

        $this->assertDatabaseHas('pet_microchips', [
            'pet_id' => $this->pet->id,
            'chip_number' => '982000123456789',
            'issuer' => 'HomeAgain',
            'implanted_at' => '2024-01-15 00:00:00',
        ]);
    }

    #[Test]
    public function admin_can_create_microchip_record()
    {
        $data = [
            'chip_number' => '982000987654321',
            'issuer' => 'AKC Reunite',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson("/api/pets/{$this->pet->id}/microchips", $data);

        $response->assertCreated();
        $this->assertDatabaseHas('pet_microchips', array_merge($data, ['pet_id' => $this->pet->id]));
    }

    #[Test]
    public function other_users_cannot_create_microchip_record()
    {
        $data = ['chip_number' => '982000111111111'];

        $response = $this->actingAs($this->otherUser)
            ->postJson("/api/pets/{$this->pet->id}/microchips", $data);

        $response->assertForbidden();
        $this->assertDatabaseMissing('pet_microchips', $data);
    }

    #[Test]
    public function chip_number_is_required()
    {
        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('chip_number');
    }

    #[Test]
    public function chip_number_must_be_unique()
    {
        $existingChip = PetMicrochip::factory()->create(['chip_number' => '982000123456789']);

        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", [
                'chip_number' => '982000123456789',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('chip_number');
    }

    #[Test]
    public function chip_number_must_be_valid_length()
    {
        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", [
                'chip_number' => '123', // Too short
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('chip_number');

        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", [
                'chip_number' => str_repeat('1', 25), // Too long
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('chip_number');
    }

    #[Test]
    public function implanted_at_must_be_valid_date()
    {
        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$this->pet->id}/microchips", [
                'chip_number' => '982000123456789',
                'implanted_at' => 'invalid-date',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('implanted_at');
    }

    #[Test]
    public function owner_can_view_specific_microchip()
    {
        $microchip = PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->owner)
            ->getJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $microchip->id)
            ->assertJsonPath('data.chip_number', $microchip->chip_number);
    }

    #[Test]
    public function cannot_view_microchip_from_different_pet()
    {
        $otherPet = Pet::factory()->create();
        $microchip = PetMicrochip::factory()->create(['pet_id' => $otherPet->id]);

        $response = $this->actingAs($this->owner)
            ->getJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}");

        $response->assertNotFound();
    }

    #[Test]
    public function owner_can_update_microchip()
    {
        $microchip = PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $updateData = [
            'chip_number' => '982000999999999',
            'issuer' => 'Updated Issuer',
            'implanted_at' => '2024-02-01',
        ];

        $response = $this->actingAs($this->owner)
            ->putJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}", $updateData);

        $response->assertOk()
            ->assertJsonFragment([
                'chip_number' => '982000999999999',
                'issuer' => 'Updated Issuer',
            ])
            ->assertJsonPath('data.chip_number', '982000999999999')
            ->assertJsonPath('data.issuer', 'Updated Issuer');

        $this->assertDatabaseHas('pet_microchips', [
            'id' => $microchip->id,
            'chip_number' => '982000999999999',
            'issuer' => 'Updated Issuer',
            'implanted_at' => '2024-02-01 00:00:00',
        ]);
    }

    #[Test]
    public function cannot_update_chip_number_to_existing_number()
    {
        $existingChip = PetMicrochip::factory()->create(['chip_number' => '982000111111111']);
        $microchip = PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->owner)
            ->putJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}", [
                'chip_number' => '982000111111111',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('chip_number');
    }

    #[Test]
    public function owner_can_delete_microchip()
    {
        $microchip = PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->owner)
            ->deleteJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}");

        $response->assertOk()
            ->assertJsonPath('data', true);

        $this->assertDatabaseMissing('pet_microchips', ['id' => $microchip->id]);
    }

    #[Test]
    public function other_users_cannot_delete_microchip()
    {
        $microchip = PetMicrochip::factory()->create(['pet_id' => $this->pet->id]);

        $response = $this->actingAs($this->otherUser)
            ->deleteJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('pet_microchips', ['id' => $microchip->id]);
    }

    #[Test]
    public function microchips_are_ordered_by_implanted_date_desc_then_created_date()
    {
        $newest = PetMicrochip::factory()->create([
            'pet_id' => $this->pet->id,
            'implanted_at' => '2024-03-01',
            'created_at' => now()->subDay(),
        ]);

        $oldest = PetMicrochip::factory()->create([
            'pet_id' => $this->pet->id,
            'implanted_at' => '2024-01-01',
            'created_at' => now()->subWeek(),
        ]);

        $middle = PetMicrochip::factory()->create([
            'pet_id' => $this->pet->id,
            'implanted_at' => '2024-02-01',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson("/api/pets/{$this->pet->id}/microchips");

        $response->assertOk();

        $microchips = $response->json('data.data');
        $this->assertEquals($newest->id, $microchips[0]['id']);
        $this->assertEquals($middle->id, $microchips[1]['id']);
        $this->assertEquals($oldest->id, $microchips[2]['id']);
    }

    #[Test]
    public function capability_gating_prevents_microchips_for_unsupported_pet_types()
    {
        // Note: This test assumes microchips are only supported for cats
        // If the capability service changes to support other types, this test should be updated
        $petType = \App\Models\PetType::factory()->create(['slug' => 'bird']);
        $bird = Pet::factory()->create([
            'user_id' => $this->owner->id,
            'pet_type_id' => $petType->id,
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson("/api/pets/{$bird->id}/microchips");

        $response->assertUnprocessable()
            ->assertJsonFragment(['error_code' => 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE']);

        $response = $this->actingAs($this->owner)
            ->postJson("/api/pets/{$bird->id}/microchips", [
                'chip_number' => '982000123456789',
            ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['error_code' => 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE']);
    }
}
