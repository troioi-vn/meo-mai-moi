<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_user_gets_standard_api_error_envelope_for_admin_route(): void
    {
        $actor = User::factory()->create();
        $target = User::factory()->create();

        Sanctum::actingAs($actor);

        $response = $this->postJson("/api/admin/users/{$target->id}/ban", [
            'reason' => 'cleanup-session-test',
        ]);

        $response
            ->assertForbidden()
            ->assertJson([
                'success' => false,
                'data' => null,
                'message' => __('messages.unauthorized'),
                'error' => __('messages.unauthorized'),
            ]);

        $this->assertDatabaseMissing('users', [
            'id' => $target->id,
            'is_banned' => true,
        ]);
    }
}
