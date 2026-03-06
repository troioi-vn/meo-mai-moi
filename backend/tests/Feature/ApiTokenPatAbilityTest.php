<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\PetType;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Models\WeightHistory;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiTokenPatAbilityTest extends TestCase
{
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
