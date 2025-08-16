<?php

namespace Database\Factories;

use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return [
            'reviewer_user_id' => User::factory(),
            'reviewed_user_id' => User::factory(),
            'rating' => $this->faker->numberBetween(1, 5),
            'comment' => $this->faker->paragraph(),
            'transfer_id' => null, // Make nullable by default
            'status' => 'active',
            'moderation_notes' => null,
            'is_flagged' => false,
            'flagged_at' => null,
            'moderated_by' => null,
            'moderated_at' => null,
        ];
    }

    public function flagged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'flagged',
            'is_flagged' => true,
            'flagged_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'moderation_notes' => $this->faker->sentence(),
        ]);
    }

    public function hidden(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'hidden',
            'moderated_by' => User::factory(),
            'moderated_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }

    public function deleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'deleted',
            'moderated_by' => User::factory(),
            'moderated_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }
}
