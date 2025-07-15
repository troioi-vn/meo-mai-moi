<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Cat>
 */
class CatFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->name(),
            'breed' => $this->faker->word(),
            'birthday' => $this->faker->date(),
            'location' => $this->faker->city(),
            'status' => 'available',
            'description' => $this->faker->paragraph,
        ];
    }
}