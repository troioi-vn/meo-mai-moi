<?php

namespace Database\Factories;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CatFactory extends Factory
{
    protected $model = Cat::class;

    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->name(),
            'breed' => $this->faker->word(),
            'birthday' => $this->faker->date(),
            'description' => $this->faker->paragraph(),
            'location' => $this->faker->city(),
            'status' => 'active',
        ];
    }
}
