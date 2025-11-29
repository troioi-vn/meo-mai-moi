<?php

namespace Database\Factories;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PushSubscription>
 */
class PushSubscriptionFactory extends Factory
{
    protected $model = PushSubscription::class;

    public function definition(): array
    {
        $endpoint = fake()->unique()->url().'#'.fake()->uuid();

        return [
            'user_id' => User::factory(),
            'endpoint' => $endpoint,
            'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
            'p256dh' => base64_encode(fake()->sha1()),
            'auth' => base64_encode(fake()->sha1()),
            'content_encoding' => 'aes128gcm',
            'expires_at' => null,
            'last_seen_at' => now(),
        ];
    }
}
