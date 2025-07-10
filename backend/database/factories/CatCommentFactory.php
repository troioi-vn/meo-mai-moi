<?php

namespace Database\Factories;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CatComment>
 */
class CatCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cat_id' => Cat::factory(),
            'user_id' => User::factory(),
            'comment' => $this->faker->sentence(),
        ];
    }
}