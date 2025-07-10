<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_update_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $response = $this->putJson("/api/cats/{$cat->id}", ['name' => 'New Name']);
        $response->assertStatus(401);
    }

    public function test_non_custodian_cannot_update_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $nonCustodian = User::factory()->create();
        Sanctum::actingAs($nonCustodian);

        $response = $this->putJson("/api/cats/{$cat->id}", ['name' => 'New Name']);
        $response->assertStatus(403);
    }

    public function test_custodian_can_update_cat_profile(): void
    {
        $custodian = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $custodian->id]);
        Sanctum::actingAs($custodian);

        $updateData = ['name' => 'Updated Name'];
        $response = $this->putJson("/api/cats/{$cat->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment($updateData);
        $this->assertDatabaseHas('cats', ['id' => $cat->id, 'name' => 'Updated Name']);
    }

    public function test_admin_can_update_any_cat_profile(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create();
        Sanctum::actingAs($admin);

        $updateData = ['name' => 'Admin Updated Name'];
        $response = $this->putJson("/api/cats/{$cat->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment($updateData);
        $this->assertDatabaseHas('cats', ['id' => $cat->id, 'name' => 'Admin Updated Name']);
    }
}
