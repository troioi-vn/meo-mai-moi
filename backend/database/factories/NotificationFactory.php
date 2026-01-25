<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $readAt = $this->faker->boolean ? $this->faker->dateTime : null;

        return [
            'user_id' => User::factory(),
            'message' => $this->faker->sentence,
            'read_at' => $readAt,
            'is_read' => $readAt !== null,
            'link' => $this->faker->url,
        ];
    }
}
