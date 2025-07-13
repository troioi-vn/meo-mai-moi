<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatWeightHistoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_custodian_can_add_weight_record(): void
    {
        $custodian = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $custodian->id]);
        Sanctum::actingAs($custodian);

        $weightData = [
            'weight_kg' => 4.5,
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/weight-history", $weightData);

        $response->assertStatus(201);
        $weightHistory = \App\Models\WeightHistory::first();
        $this->assertEquals($cat->id, $weightHistory->cat_id);
        $this->assertEquals(4.5, $weightHistory->weight_kg);
        $this->assertEquals('2025-07-10', $weightHistory->record_date->format('Y-m-d'));
    }

    public function test_admin_can_add_weight_record(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create();
        Sanctum::actingAs($admin);

        $weightData = [
            'weight_kg' => 4.5,
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/weight-history", $weightData);

        $response->assertStatus(201);
        $weightHistory = \App\Models\WeightHistory::first();
        $this->assertEquals($cat->id, $weightHistory->cat_id);
        $this->assertEquals(4.5, $weightHistory->weight_kg);
        $this->assertEquals('2025-07-10', $weightHistory->record_date->format('Y-m-d'));
    }

    public function test_guest_cannot_add_weight_record(): void
    {
        $cat = Cat::factory()->create();
        $weightData = [
            'weight_kg' => 4.5,
            'record_date' => '2025-07-10',
        ];

        $response = $this->postJson("/api/cats/{$cat->id}/weight-history", $weightData);

        $response->assertStatus(401);
    }
}