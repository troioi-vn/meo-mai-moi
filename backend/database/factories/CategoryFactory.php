<?php

namespace Database\Factories;

use App\Models\PetType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->unique()->words(2, true);

        return [
            'name' => ucfirst($name),
            'slug' => Str::slug($name),
            'pet_type_id' => PetType::factory(),
            'description' => $this->faker->optional()->sentence,
            'created_by' => null,
            'approved_at' => now(), // Default to approved
        ];
    }

    /**
     * Indicate that the category is unapproved.
     */
    public function unapproved(): static
    {
        return $this->state(fn (array $attributes) => [
            'approved_at' => null,
        ]);
    }

    /**
     * Indicate the category was created by a specific user.
     */
    public function createdBy(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'created_by' => $user->id,
        ]);
    }

    /**
     * Indicate the category belongs to a specific pet type.
     */
    public function forPetType(PetType $petType): static
    {
        return $this->state(fn (array $attributes) => [
            'pet_type_id' => $petType->id,
        ]);
    }
}
