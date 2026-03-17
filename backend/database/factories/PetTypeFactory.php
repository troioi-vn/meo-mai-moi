<?php

namespace Database\Factories;

use App\Enums\PetTypeStatus;
use App\Models\PetType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PetType>
 */
class PetTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->word,
            'slug' => $this->faker->slug,
            'description' => $this->faker->sentence,
            'status' => PetTypeStatus::ACTIVE,
            'is_system' => false,
            'display_order' => 0,
            'placement_requests_allowed' => false,
            'weight_tracking_allowed' => false,
        ];
    }
}
