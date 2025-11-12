<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PushSubscriptionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function subscriptionPayload(): array
    {
        return [
            'endpoint' => 'https://example.pushservice.com/some/endpoint',
            'keys' => [
                'p256dh' => 'p256dh-key',
                'auth' => 'auth-key',
            ],
            'contentEncoding' => 'aes128gcm',
            'expirationTime' => now()->addDay()->toISOString(),
        ];
    }

    #[Test]
    public function it_stores_push_subscriptions_for_authenticated_users(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/push-subscriptions', $this->subscriptionPayload());

        $response->assertCreated();
        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint_hash' => PushSubscription::hashEndpoint('https://example.pushservice.com/some/endpoint'),
        ]);
    }

    #[Test]
    public function it_allows_users_to_delete_their_subscriptions(): void
    {
        $user = User::factory()->create();
        $subscription = PushSubscription::factory()->create([
            'user_id' => $user->id,
            'endpoint' => 'https://example.pushservice.com/some/endpoint',
            'endpoint_hash' => PushSubscription::hashEndpoint('https://example.pushservice.com/some/endpoint'),
        ]);

        $response = $this->actingAs($user)->deleteJson('/api/push-subscriptions', [
            'endpoint' => $subscription->endpoint,
        ]);

        $response->assertNoContent();
        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    #[Test]
    public function it_lists_current_user_subscriptions(): void
    {
        $user = User::factory()->create();
        PushSubscription::factory()->count(2)->create([
            'user_id' => $user->id,
        ]);

        $otherUser = User::factory()->create();
        PushSubscription::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/push-subscriptions');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }
}

