<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Tests\TestCase;

class PushSubscriptionOwnershipTest extends TestCase
{
    public function test_cross_user_endpoint_takeover_is_refused(): void
    {
        $owner = User::factory()->create();
        $poster = User::factory()->create();
        $endpoint = 'https://example.pushservice.com/takeover/target';

        $subscription = PushSubscription::factory()->create([
            'user_id' => $owner->id,
            'endpoint' => $endpoint,
            'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
            'p256dh' => 'original-p256dh',
            'auth' => 'original-auth',
        ]);

        $response = $this->actingAs($poster)->postJson('/api/push-subscriptions', [
            'endpoint' => $endpoint,
            'keys' => [
                'p256dh' => 'attacker-p256dh',
                'auth' => 'attacker-auth',
            ],
        ]);

        $response
            ->assertConflict()
            ->assertJsonPath('message', __('messages.push_subscriptions.endpoint_in_use'));

        $this->assertDatabaseCount('push_subscriptions', 1);
        $this->assertDatabaseHas('push_subscriptions', [
            'id' => $subscription->id,
            'user_id' => $owner->id,
            'p256dh' => 'original-p256dh',
            'auth' => 'original-auth',
        ]);
    }

    public function test_same_user_resubscribe_updates_in_place(): void
    {
        $user = User::factory()->create();
        $endpoint = 'https://example.pushservice.com/resubscribe/mine';

        $subscription = PushSubscription::factory()->create([
            'user_id' => $user->id,
            'endpoint' => $endpoint,
            'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
            'p256dh' => 'original-p256dh',
            'auth' => 'original-auth',
        ]);

        $response = $this->actingAs($user)->postJson('/api/push-subscriptions', [
            'endpoint' => $endpoint,
            'keys' => [
                'p256dh' => 'rotated-p256dh',
                'auth' => 'rotated-auth',
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.id', $subscription->id);

        $this->assertDatabaseCount('push_subscriptions', 1);
        $this->assertDatabaseHas('push_subscriptions', [
            'id' => $subscription->id,
            'user_id' => $user->id,
            'p256dh' => 'rotated-p256dh',
            'auth' => 'rotated-auth',
        ]);
    }
}
