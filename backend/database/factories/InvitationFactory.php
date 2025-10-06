<?php

namespace Database\Factories;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invitation>
 */
class InvitationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => Str::random(32),
            'inviter_user_id' => User::factory(),
            'recipient_user_id' => null,
            'status' => 'pending',
            'expires_at' => null,
        ];
    }

    /**
     * Indicate that the invitation is accepted.
     */
    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'accepted',
            'recipient_user_id' => User::factory(),
        ]);
    }

    /**
     * Indicate that the invitation is revoked.
     */
    public function revoked(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'revoked',
        ]);
    }

    /**
     * Indicate that the invitation is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'expired',
        ]);
    }

    /**
     * Indicate that the invitation has an expiry date.
     */
    public function withExpiry(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => fake()->dateTimeBetween('now', '+30 days'),
        ]);
    }

    /**
     * Indicate that the invitation is expired by date.
     */
    public function expiredByDate(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => fake()->dateTimeBetween('-30 days', '-1 day'),
        ]);
    }
}