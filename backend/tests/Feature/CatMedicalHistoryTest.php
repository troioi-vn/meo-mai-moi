<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\MedicalRecord;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatMedicalHistoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_custodian_can_add_medical_record(): void
    {
        $custodian = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $custodian->id]);
        Sanctum::actingAs($custodian);

        $medicalData = [
            'record_type' => 'vaccination',
            'description' => 'Rabies vaccine',
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/medical-records", $medicalData);

        $response->assertStatus(201);
        $medicalRecord = MedicalRecord::first();
        $this->assertEquals($cat->id, $medicalRecord->cat_id);
        $this->assertEquals('vaccination', $medicalRecord->record_type);
        $this->assertEquals('Rabies vaccine', $medicalRecord->description);
        $this->assertEquals('2025-07-10', $medicalRecord->record_date->format('Y-m-d'));
    }

    public function test_admin_can_add_medical_record(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create();
        Sanctum::actingAs($admin);

        $medicalData = [
            'record_type' => 'vaccination',
            'description' => 'Rabies vaccine',
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/medical-records", $medicalData);

        $response->assertStatus(201);
        $medicalRecord = MedicalRecord::first();
        $this->assertEquals($cat->id, $medicalRecord->cat_id);
        $this->assertEquals('vaccination', $medicalRecord->record_type);
        $this->assertEquals('Rabies vaccine', $medicalRecord->description);
        $this->assertEquals('2025-07-10', $medicalRecord->record_date->format('Y-m-d'));
    }

    public function test_guest_cannot_add_medical_record(): void
    {
        $cat = Cat::factory()->create();
        $medicalData = [
            'record_type' => 'vaccination',
            'description' => 'Rabies vaccine',
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/medical-records", $medicalData);

        $response->assertStatus(401);
    }
}