<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\OwnerWeightHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerWeightHistoryFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_crud_owner_weight_history(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $create = $this->postJson('/api/users/me/owner-weights', [
            'weight_kg' => 62.4,
            'record_date' => '2024-05-01',
        ]);

        $create->assertCreated()->assertJsonPath('data.weight_kg', 62.4);
        $id = $create->json('data.id');

        $this->getJson('/api/users/me/owner-weights')
            ->assertOk()
            ->assertJsonStructure(['data' => ['data', 'links', 'meta']]);

        $this->putJson("/api/users/me/owner-weights/{$id}", [
            'weight_kg' => 63.1,
        ])->assertOk()->assertJsonPath('data.weight_kg', 63.1);

        $this->deleteJson("/api/users/me/owner-weights/{$id}")
            ->assertOk()
            ->assertJsonPath('data', true);

        $this->assertDatabaseMissing('owner_weight_histories', ['id' => $id]);
    }

    public function test_authenticated_user_cannot_access_another_users_owner_weight_history(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $history = OwnerWeightHistory::query()->create([
            'user_id' => $owner->id,
            'weight_kg' => 61.0,
            'record_date' => '2024-05-02',
        ]);

        Sanctum::actingAs($otherUser);

        $this->putJson("/api/users/me/owner-weights/{$history->id}", [
            'weight_kg' => 64.0,
        ])->assertNotFound();

        $this->deleteJson("/api/users/me/owner-weights/{$history->id}")
            ->assertNotFound();
    }
}