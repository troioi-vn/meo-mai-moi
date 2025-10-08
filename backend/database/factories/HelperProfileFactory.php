<?php

namespace Database\Factories;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class HelperProfileFactory extends Factory
{
    protected $model = HelperProfile::class;

    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'country' => $this->faker->country(),
            'address' => $this->faker->address(),
            'city' => $this->faker->city(),
            'state' => $this->faker->stateAbbr(),
            'zip_code' => $this->faker->postcode(),
            'phone_number' => $this->faker->phoneNumber(),
            'experience' => $this->faker->paragraph(),
            'has_pets' => $this->faker->boolean(),
            'has_children' => $this->faker->boolean(),
            'can_foster' => $this->faker->boolean(),
            'can_adopt' => $this->faker->boolean(),
            'approval_status' => 'approved',
            'is_public' => true,
        ];
    }
}
