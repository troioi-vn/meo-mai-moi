<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Models\WeightHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class McpPhase5BWriteTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_record_deletes_are_exact_versioned_and_replay_safe(): void
    {
        $user = User::factory()->create();
        $pet = $this->petFor($user);
        $token = $user->createToken('MCP health write', ['health:write'])->plainTextToken;

        $weight = WeightHistory::factory()->create([
            'pet_id' => $pet->id,
            'weight_kg' => 4.25,
            'record_date' => '2026-07-20',
        ]);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-weight-missing-target')
            ->deleteJson("/api/pets/{$pet->id}/weights/{$weight->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['base_version', 'expected_weight_kg', 'expected_record_date']);
        $weightPayload = [
            'base_version' => $weight->updated_at?->toISOString(),
            'expected_weight_kg' => 4.25,
            'expected_record_date' => '2026-07-20',
        ];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-weight-stale')
            ->deleteJson("/api/pets/{$pet->id}/weights/{$weight->id}", [
                ...$weightPayload,
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-weight-delete')
            ->deleteJson("/api/pets/{$pet->id}/weights/{$weight->id}", $weightPayload)
            ->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-weight-delete')
            ->deleteJson("/api/pets/{$pet->id}/weights/{$weight->id}", $weightPayload)
            ->assertOk();

        $medical = MedicalRecord::query()->create([
            'pet_id' => $pet->id,
            'record_type' => 'checkup',
            'description' => 'Disposable record',
            'record_date' => '2026-07-19',
        ]);
        $medicalPayload = [
            'base_version' => $medical->updated_at?->toISOString(),
            'expected_record_type' => 'checkup',
            'expected_record_date' => '2026-07-19',
        ];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-finance-denied')
            ->deleteJson(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}?linked_transaction=delete",
                $medicalPayload,
            )->assertForbidden();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}?linked_transaction=keep",
                $medicalPayload,
            )->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}?linked_transaction=keep",
                $medicalPayload,
            )->assertOk();

        $vaccination = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
            'vaccine_name' => 'Disposable Vaccine',
            'administered_at' => '2026-07-18',
        ]);
        $vaccinationPayload = [
            'base_version' => $vaccination->updated_at?->toISOString(),
            'expected_vaccine_name' => 'Disposable Vaccine',
            'expected_administered_at' => '2026-07-18',
        ];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-mismatch')
            ->deleteJson(
                "/api/pets/{$pet->id}/vaccinations/{$vaccination->id}?linked_transaction=keep",
                [...$vaccinationPayload, 'expected_vaccine_name' => 'Another Vaccine'],
            )->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/vaccinations/{$vaccination->id}?linked_transaction=keep",
                $vaccinationPayload,
            )->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/vaccinations/{$vaccination->id}?linked_transaction=keep",
                $vaccinationPayload,
            )->assertOk();
    }

    public function test_vaccination_renewal_and_health_media_are_guarded_and_replay_safe(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $pet = $this->petFor($user);
        $token = $user->createToken('MCP health write', ['health:write'])->plainTextToken;
        $vaccination = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
            'vaccine_name' => 'Annual Vaccine',
            'administered_at' => '2025-07-20',
            'due_at' => '2026-07-20',
        ]);
        $renewalPayload = [
            'vaccine_name' => 'Annual Vaccine',
            'administered_at' => '2026-07-20',
            'due_at' => '2027-07-20',
            'expected_vaccine_name' => 'Annual Vaccine',
            'expected_administered_at' => '2025-07-20',
            'base_version' => $vaccination->updated_at?->toISOString(),
        ];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-renew-finance-denied')
            ->postJson("/api/pets/{$pet->id}/vaccinations/{$vaccination->id}/renew", [
                ...$renewalPayload,
                'finance_expense' => [
                    'ledger_id' => 1,
                    'account_id' => 1,
                    'amount' => '10.00',
                ],
            ])->assertForbidden();
        $renewed = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-renew')
            ->postJson(
                "/api/pets/{$pet->id}/vaccinations/{$vaccination->id}/renew",
                $renewalPayload,
            )->assertCreated();
        $renewedId = (int) $renewed->json('data.id');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-renew')
            ->postJson(
                "/api/pets/{$pet->id}/vaccinations/{$vaccination->id}/renew",
                $renewalPayload,
            )->assertCreated()->assertJsonPath('data.id', $renewedId);
        $this->assertNotNull($vaccination->fresh()?->completed_at);

        $renewedRecord = VaccinationRecord::query()->findOrFail($renewedId);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-photo-missing-version')
            ->post(
                "/api/pets/{$pet->id}/vaccinations/{$renewedId}/photo",
                ['photo' => $this->image(), 'expected_photo_id' => null],
                ['Accept' => 'application/json'],
            )->assertUnprocessable()->assertJsonValidationErrors(['base_version']);
        $this->travel(1)->seconds();
        $photo = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-photo')
            ->post(
                "/api/pets/{$pet->id}/vaccinations/{$renewedId}/photo",
                [
                    'photo' => $this->image(),
                    'expected_photo_id' => null,
                    'base_version' => $renewedRecord->updated_at?->toISOString(),
                ],
                ['Accept' => 'application/json'],
            )->assertOk();
        $photoId = (int) $photo->json('data.photo.id');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-photo')
            ->post(
                "/api/pets/{$pet->id}/vaccinations/{$renewedId}/photo",
                [
                    'photo' => $this->image(),
                    'expected_photo_id' => null,
                    'base_version' => $renewedRecord->updated_at?->toISOString(),
                ],
                ['Accept' => 'application/json'],
            )->assertOk()->assertJsonPath('data.photo.id', $photoId);
        $photoVersion = VaccinationRecord::query()->findOrFail($renewedId)->updated_at?->toISOString();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-photo-delete')
            ->deleteJson("/api/pets/{$pet->id}/vaccinations/{$renewedId}/photo", [
                'expected_photo_id' => $photoId,
                'base_version' => $photoVersion,
            ])->assertNoContent();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-vaccination-photo-delete')
            ->deleteJson("/api/pets/{$pet->id}/vaccinations/{$renewedId}/photo", [
                'expected_photo_id' => $photoId,
                'base_version' => $photoVersion,
            ])->assertNoContent();

        $medical = MedicalRecord::query()->create([
            'pet_id' => $pet->id,
            'record_type' => 'checkup',
            'description' => 'Disposable record',
            'record_date' => '2026-07-20',
        ]);
        $this->travel(1)->seconds();
        $medicalPhoto = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-photo')
            ->post(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}/photos",
                [
                    'photo' => $this->image(),
                    'base_version' => $medical->updated_at?->toISOString(),
                ],
                ['Accept' => 'application/json'],
            )->assertOk();
        $medicalPhotoId = (int) $medicalPhoto->json('data.photos.0.id');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-photo')
            ->post(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}/photos",
                [
                    'photo' => $this->image(),
                    'base_version' => $medical->updated_at?->toISOString(),
                ],
                ['Accept' => 'application/json'],
            )->assertOk()->assertJsonCount(1, 'data.photos');
        $medicalVersion = MedicalRecord::query()->findOrFail($medical->id)->updated_at?->toISOString();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-photo-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}/photos/{$medicalPhotoId}",
                ['base_version' => $medicalVersion],
            )->assertNoContent();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-five-medical-photo-delete')
            ->deleteJson(
                "/api/pets/{$pet->id}/medical-records/{$medical->id}/photos/{$medicalPhotoId}",
                ['base_version' => $medicalVersion],
            )->assertNoContent();
    }

    private function petFor(User $user): Pet
    {
        $petType = PetType::factory()->create(['slug' => 'cat']);

        return Pet::factory()->create([
            'created_by' => $user->id,
            'pet_type_id' => $petType->id,
            'country' => 'VN',
        ]);
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'phase-five.png',
            (string) base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
            ),
        );
    }
}
