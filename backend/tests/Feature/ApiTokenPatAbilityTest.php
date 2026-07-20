<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\Habit;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\PetType;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Models\WeightHistory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiTokenPatAbilityTest extends TestCase
{
    #[Test]
    public function mcp_sharing_abilities_are_narrow_and_sharing_writes_are_replay_safe(): void
    {
        $owner = User::factory()->create();
        $petType = PetType::factory()->create(['slug' => 'cat']);
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ]);
        $sharingRead = $owner->createToken('MCP sharing read', ['sharing:read'])->plainTextToken;
        $this->withToken($sharingRead)->getJson("/api/pets/{$pet->id}/sharing")
            ->assertOk()
            ->assertJsonPath('data.pet_id', $pet->id)
            ->assertJsonPath('data.relationships.0.user_id', $owner->id)
            ->assertJsonMissingPath('data.relationships.0.user.email')
            ->assertJsonMissingPath('data.relationships.0.created_by');
        $this->withToken($sharingRead)->getJson('/api/my-pets')->assertForbidden();
        $this->withToken($sharingRead)->getJson("/api/pets/{$pet->id}/weights")->assertForbidden();

        $petsRead = $owner->createToken('MCP pets only', ['pets:read'])->plainTextToken;
        $this->withToken($petsRead)->getJson("/api/pets/{$pet->id}/sharing")->assertForbidden();

        $sharingWrite = $owner->createToken('MCP sharing write', ['sharing:write'])->plainTextToken;
        $payload = [
            'relationship_type' => 'viewer',
            'base_version' => $pet->updated_at?->toJSON(),
        ];
        $first = $this->withToken($sharingWrite)
            ->withHeader('Idempotency-Key', 'sharing-create-invitation')
            ->postJson("/api/pets/{$pet->id}/invitations", $payload)
            ->assertCreated();
        $invitationId = (int) $first->json('data.invitation.id');
        $this->withToken($sharingWrite)
            ->withHeader('Idempotency-Key', 'sharing-create-invitation')
            ->postJson("/api/pets/{$pet->id}/invitations", $payload)
            ->assertCreated()
            ->assertJsonPath('data.invitation.id', $invitationId);
        $this->withToken($sharingWrite)
            ->withHeader('Idempotency-Key', 'sharing-cross-domain-denied')
            ->postJson('/api/pets', [
                'name' => 'Blocked cross-domain pet',
                'country' => 'VN',
                'pet_type_id' => $petType->id,
            ])->assertForbidden();

        $pet->refresh();
        $this->withToken($sharingWrite)
            ->withHeader('Idempotency-Key', 'sharing-stale-invitation')
            ->postJson("/api/pets/{$pet->id}/invitations", [
                'relationship_type' => 'viewer',
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])->assertStatus(409)
            ->assertJsonPath('data.server_version', $pet->updated_at?->toJSON());

        $this->withToken($sharingWrite)
            ->withHeader('Idempotency-Key', 'sharing-last-owner-leave')
            ->postJson("/api/pets/{$pet->id}/leave", [
                'base_version' => $pet->updated_at?->toJSON(),
            ])->assertStatus(409)
            ->assertJsonPath('data.code', 'last_owner_conflict');

        $legacyRead = $owner->createToken('Legacy sharing read', ['read'])->plainTextToken;
        $this->withToken($legacyRead)->getJson("/api/pets/{$pet->id}/sharing")->assertOk();
    }

    #[Test]
    public function mcp_domain_read_abilities_are_narrow_while_legacy_read_remains_compatible(): void
    {
        $owner = User::factory()->create();
        $petType = PetType::factory()->create(['slug' => 'cat']);
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'pet_type_id' => $petType->id,
        ]);
        $petsToken = $owner->createToken('MCP pets read', ['pets:read'])->plainTextToken;
        $this->withToken($petsToken)->getJson('/api/my-pets')->assertOk();
        $this->withToken($petsToken)->getJson("/api/pets/{$pet->id}")->assertOk();
        $this->withToken($petsToken)
            ->getJson("/api/pets/{$pet->id}/weights")
            ->assertForbidden();

        $healthToken = $owner->createToken('MCP health read', ['health:read'])->plainTextToken;
        $this->withToken($healthToken)->getJson('/api/my-pets')->assertForbidden();
        $this->withToken($healthToken)->getJson("/api/pets/{$pet->id}")->assertForbidden();
        $this->withToken($healthToken)
            ->getJson("/api/pets/{$pet->id}/weights")
            ->assertOk();

        $legacyToken = $owner->createToken('Legacy read', ['read'])->plainTextToken;
        $this->withToken($legacyToken)->getJson('/api/my-pets')->assertOk();
        $this->withToken($legacyToken)
            ->getJson("/api/pets/{$pet->id}/weights")
            ->assertOk();
    }

    #[Test]
    public function mcp_domain_write_abilities_are_narrow_while_legacy_writes_remain_compatible(): void
    {
        $owner = User::factory()->create();
        $petType = PetType::factory()->create(['slug' => 'cat']);
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ]);

        $petWriteToken = $owner->createToken('MCP pet write', ['pet:write'])->plainTextToken;
        $this->withToken($petWriteToken)->postJson('/api/pets', [
            'name' => 'Scoped Pet',
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ])->assertCreated();

        $retryPayload = [
            'name' => 'Retry Safe Pet',
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ];
        $first = $this->withToken($petWriteToken)
            ->withHeader('Idempotency-Key', 'mcp-pet-create-retry')
            ->postJson('/api/pets', $retryPayload)
            ->assertCreated();
        $retryPetId = (int) $first->json('data.id');
        $this->withToken($petWriteToken)
            ->withHeader('Idempotency-Key', 'mcp-pet-create-retry')
            ->postJson('/api/pets', $retryPayload)
            ->assertCreated()
            ->assertJsonPath('data.id', $retryPetId);
        $this->assertSame(1, Pet::query()
            ->where('created_by', $owner->id)
            ->where('pet_type_id', $petType->id)
            ->where('name', 'Retry Safe Pet')
            ->count());

        $this->withToken($petWriteToken)
            ->withHeader('Idempotency-Key', 'mcp-pet-create-distinct-intent')
            ->postJson('/api/pets', $retryPayload)
            ->assertStatus(409)
            ->assertJsonPath('error', 'duplicate_pet')
            ->assertJsonPath('data.existing_pet_ids.0', $retryPetId);

        $this->withToken($petWriteToken)
            ->withHeader('Idempotency-Key', 'mcp-pet-create-allowed-duplicate')
            ->postJson('/api/pets', [...$retryPayload, 'allow_duplicate' => true])
            ->assertCreated();
        $this->withToken($petWriteToken)
            ->withHeader('Idempotency-Key', 'pet-write-health-denied')
            ->postJson("/api/pets/{$pet->id}/weights", [
            'weight_kg' => 4.2,
            'record_date' => '2026-07-20',
        ])->assertForbidden();

        $healthWriteToken = $owner->createToken('MCP health write', ['health:write'])->plainTextToken;
        $this->withToken($healthWriteToken)
            ->withHeader('Idempotency-Key', 'health-write-weight-create')
            ->postJson("/api/pets/{$pet->id}/weights", [
            'weight_kg' => 4.2,
            'record_date' => '2026-07-20',
        ])->assertCreated();
        $this->withToken($healthWriteToken)
            ->withHeader('Idempotency-Key', 'health-write-pet-denied')
            ->postJson('/api/pets', [
            'name' => 'Blocked Pet',
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ])->assertForbidden();

        $legacyCreate = $owner->createToken('Legacy create', ['create'])->plainTextToken;
        $this->withToken($legacyCreate)->postJson('/api/pets', [
            'name' => 'Legacy Pet',
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ])->assertCreated();
    }

    #[Test]
    public function mcp_phase_two_pet_care_abilities_are_independent_and_cover_their_routes(): void
    {
        $owner = User::factory()->create();
        $petType = PetType::factory()->create(['slug' => 'cat']);
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'country' => 'VN',
            'pet_type_id' => $petType->id,
        ]);

        $habitsRead = $owner->createToken('MCP habits read', ['habits:read'])->plainTextToken;
        $this->withToken($habitsRead)->getJson('/api/habits')->assertOk();
        $this->withToken($habitsRead)
            ->getJson("/api/pets/{$pet->id}/microchips")
            ->assertForbidden();

        $microchipsRead = $owner->createToken('MCP microchips read', ['microchips:read'])->plainTextToken;
        $this->withToken($microchipsRead)
            ->getJson("/api/pets/{$pet->id}/microchips")
            ->assertOk();
        $this->withToken($microchipsRead)->getJson('/api/habits')->assertForbidden();

        $habitsWrite = $owner->createToken('MCP habits write', ['habits:write'])->plainTextToken;
        $habitResponse = $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-create')
            ->postJson('/api/habits', [
                'name' => 'MCP scoped habit',
                'value_type' => 'yes_no',
                'pet_ids' => [$pet->id],
            ])
            ->assertCreated();
        $habitId = (int) $habitResponse->json('data.id');
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-update')
            ->putJson("/api/habits/{$habitId}", ['name' => 'MCP scoped habit updated'])
            ->assertOk();
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-entry')
            ->putJson("/api/habits/{$habitId}/entries/2026-07-20", [
                'entries' => [['pet_id' => $pet->id, 'value_int' => 1]],
            ])
            ->assertOk();
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-archive')
            ->postJson("/api/habits/{$habitId}/archive")
            ->assertOk();
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-restore')
            ->postJson("/api/habits/{$habitId}/restore")
            ->assertOk();
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-microchip-denied')
            ->postJson("/api/pets/{$pet->id}/microchips", ['chip_number' => '1111111111'])
            ->assertForbidden();
        $this->withToken($habitsWrite)
            ->withHeader('Idempotency-Key', 'mcp-habit-delete')
            ->deleteJson("/api/habits/{$habitId}")
            ->assertOk();
        $this->assertNull(Habit::query()->find($habitId));

        $microchipsWrite = $owner->createToken('MCP microchips write', ['microchips:write'])->plainTextToken;
        $microchipResponse = $this->withToken($microchipsWrite)
            ->withHeader('Idempotency-Key', 'mcp-microchip-create')
            ->postJson("/api/pets/{$pet->id}/microchips", ['chip_number' => '2222222222'])
            ->assertCreated();
        $microchipId = (int) $microchipResponse->json('data.id');
        $this->withToken($microchipsWrite)
            ->withHeader('Idempotency-Key', 'mcp-microchip-update')
            ->putJson("/api/pets/{$pet->id}/microchips/{$microchipId}", ['issuer' => 'MCP'])
            ->assertOk();
        $this->withToken($microchipsWrite)
            ->withHeader('Idempotency-Key', 'mcp-microchip-habit-denied')
            ->postJson('/api/habits', [
                'name' => 'Blocked habit',
                'value_type' => 'yes_no',
                'pet_ids' => [$pet->id],
            ])
            ->assertForbidden();
        $this->withToken($microchipsWrite)
            ->withHeader('Idempotency-Key', 'mcp-microchip-delete')
            ->deleteJson("/api/pets/{$pet->id}/microchips/{$microchipId}?linked_transaction=keep")
            ->assertOk();

        $petWrite = $owner->createToken('MCP pet photo write', ['pet:write'])->plainTextToken;
        $photoResponse = $this->withToken($petWrite)
            ->withHeader('Idempotency-Key', 'mcp-pet-photo-create')
            ->postJson("/api/pets/{$pet->id}/photos", [
                'photo' => UploadedFile::fake()->image('mcp-photo.jpg', 64, 64),
            ])
            ->assertOk();
        $photoId = (int) $photoResponse->json('data.photos.0.id');
        $this->withToken($petWrite)
            ->withHeader('Idempotency-Key', 'mcp-pet-photo-primary')
            ->postJson("/api/pets/{$pet->id}/photos/{$photoId}/set-primary")
            ->assertOk();
        $this->withToken($petWrite)
            ->withHeader('Idempotency-Key', 'mcp-pet-photo-delete')
            ->deleteJson("/api/pets/{$pet->id}/photos/{$photoId}")
            ->assertNoContent();
        $this->withToken($petWrite)
            ->withHeader('Idempotency-Key', 'mcp-photo-microchip-denied')
            ->postJson("/api/pets/{$pet->id}/microchips", ['chip_number' => '3333333333'])
            ->assertForbidden();
    }

    #[Test]
    public function pat_ability_contract_is_enforced_across_core_pet_and_health_routes(): void
    {
        $owner = User::factory()->create();
        $city = City::factory()->create([
            'country' => 'VN',
        ]);
        $petType = PetType::factory()->create([
            'slug' => 'cat',
        ]);
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'country' => 'VN',
            'city_id' => $city->id,
            'pet_type_id' => $petType->id,
        ]);

        $readOnlyToken = $owner->createToken('Read Only', ['read']);
        $readOnlyPlainTextToken = explode('|', $readOnlyToken->plainTextToken, 2)[1];

        $this->withToken($readOnlyPlainTextToken)
            ->getJson('/api/users/me')
            ->assertOk();

        $this->withToken($readOnlyPlainTextToken)
            ->getJson('/api/my-pets')
            ->assertOk();

        $this->withToken($readOnlyPlainTextToken)
            ->getJson('/api/my-pets/sections')
            ->assertOk();

        $this->withToken($readOnlyPlainTextToken)
            ->postJson('/api/pets', [
                'name' => 'Blocked Create',
                'birthday' => '2020-01-01',
                'country' => 'VN',
                'city_id' => $city->id,
                'description' => 'Should be blocked',
                'pet_type_id' => $petType->id,
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->putJson("/api/pets/{$pet->id}", [
                'name' => 'Blocked Update',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}", [
                'password' => 'password',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/status", [
                'status' => 'lost',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $weight = WeightHistory::factory()->create([
            'pet_id' => $pet->id,
        ]);
        $medicalRecord = MedicalRecord::query()->create([
            'pet_id' => $pet->id,
            'record_type' => 'Vet Visit',
            'description' => 'Initial check',
            'record_date' => '2024-01-01',
            'vet_name' => 'Dr. Linh',
        ]);
        $vaccination = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
        ]);
        $microchip = PetMicrochip::factory()->create([
            'pet_id' => $pet->id,
        ]);

        $this->withToken($readOnlyPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/weights", [
                'weight_kg' => 4.25,
                'record_date' => '2024-06-01',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/weights/{$weight->id}", [
                'weight_kg' => 4.5,
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/medical-records/{$medicalRecord->id}")
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/vaccinations/{$vaccination->id}", [
                'notes' => 'Blocked update',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($readOnlyPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/microchips/{$microchip->id}")
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $fullAccessToken = $owner->createToken('Full Access', ['create', 'read', 'update', 'delete']);
        $fullAccessPlainTextToken = explode('|', $fullAccessToken->plainTextToken, 2)[1];

        $create = $this->withToken($fullAccessPlainTextToken)
            ->postJson('/api/pets', [
                'name' => 'Token Pet',
                'birthday' => '2020-01-01',
                'country' => 'VN',
                'city_id' => $city->id,
                'description' => 'Created with PAT',
                'pet_type_id' => $petType->id,
            ]);

        $create->assertCreated();

        $petId = (int) $create->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->getJson('/api/my-pets/sections')
            ->assertOk();

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$petId}", [
                'name' => 'Token Pet Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Token Pet Updated');

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$petId}/status", [
                'status' => 'lost',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'lost');

        $weightCreate = $this->withToken($fullAccessPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/weights", [
                'weight_kg' => 4.25,
                'record_date' => '2024-06-01',
            ])
            ->assertCreated();

        $weightId = (int) $weightCreate->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/weights/{$weightId}", [
                'weight_kg' => 4.5,
            ])
            ->assertOk()
            ->assertJsonPath('data.weight_kg', 4.5);

        $this->withToken($fullAccessPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/weights/{$weightId}")
            ->assertOk()
            ->assertJsonPath('data', true);

        $medicalCreate = $this->withToken($fullAccessPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/medical-records", [
                'record_type' => 'Vet Visit',
                'description' => 'Annual checkup',
                'record_date' => '2024-06-01',
                'vet_name' => 'Dr. Tran',
            ])
            ->assertCreated();

        $medicalId = (int) $medicalCreate->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/medical-records/{$medicalId}", [
                'description' => 'Updated checkup notes',
            ])
            ->assertOk()
            ->assertJsonPath('data.description', 'Updated checkup notes');

        $this->withToken($fullAccessPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/medical-records/{$medicalId}")
            ->assertOk()
            ->assertJsonPath('data', true);

        $vaccinationCreate = $this->withToken($fullAccessPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/vaccinations", [
                'vaccine_name' => 'Rabies',
                'administered_at' => '2024-06-01',
                'due_at' => '2025-06-01',
                'notes' => 'Annual booster',
            ])
            ->assertCreated();

        $vaccinationId = (int) $vaccinationCreate->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/vaccinations/{$vaccinationId}", [
                'notes' => 'Updated booster notes',
            ])
            ->assertOk()
            ->assertJsonPath('data.notes', 'Updated booster notes');

        $renewedVaccination = $this->withToken($fullAccessPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/vaccinations/{$vaccinationId}/renew", [
                'vaccine_name' => 'Rabies',
                'administered_at' => '2025-06-15',
                'due_at' => '2026-06-15',
                'notes' => 'Renewed',
            ])
            ->assertCreated();

        $renewedVaccinationId = (int) $renewedVaccination->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/vaccinations/{$renewedVaccinationId}")
            ->assertOk()
            ->assertJsonPath('data', true);

        $chipNumber = '982000'.Str::padLeft((string) random_int(0, 999999), 6, '0');
        $microchipCreate = $this->withToken($fullAccessPlainTextToken)
            ->postJson("/api/pets/{$pet->id}/microchips", [
                'chip_number' => $chipNumber,
                'issuer' => 'HomeAgain',
                'implanted_at' => '2024-01-15',
            ])
            ->assertCreated();

        $microchipId = (int) $microchipCreate->json('data.id');

        $this->withToken($fullAccessPlainTextToken)
            ->putJson("/api/pets/{$pet->id}/microchips/{$microchipId}", [
                'issuer' => 'AKC Reunite',
            ])
            ->assertOk()
            ->assertJsonPath('data.issuer', 'AKC Reunite');

        $this->withToken($fullAccessPlainTextToken)
            ->deleteJson("/api/pets/{$pet->id}/microchips/{$microchipId}")
            ->assertOk()
            ->assertJsonPath('data', true);

        $this->withToken($fullAccessPlainTextToken)
            ->deleteJson("/api/pets/{$petId}", [
                'password' => 'password',
            ])
            ->assertNoContent();
    }
}
