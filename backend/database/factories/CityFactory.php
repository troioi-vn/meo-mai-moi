<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\City>
 */
class CityFactory extends Factory
{
    public function definition(): array
    {
        $name = $this->faker->unique()->city();
        $country = $this->faker->countryCode();

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'country' => $country,
            'description' => $this->faker->optional()->sentence,
            'created_by' => null,
            'approved_at' => now(),
        ];
    }

    public function unapproved(): static
    {
        return $this->state(fn () => ['approved_at' => null]);
    }

    public function createdBy(User $user): static
    {
        return $this->state(fn () => ['created_by' => $user->id]);
    }
}
