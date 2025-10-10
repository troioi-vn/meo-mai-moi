<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WaitlistEntry>
 */
class WaitlistEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'status' => 'pending',
            'invited_at' => null,
        ];
    }

    /**
     * Indicate that the waitlist entry has been invited.
     */
    public function invited(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'invited',
            'invited_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ]);
    }
}
