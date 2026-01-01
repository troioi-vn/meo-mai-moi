<?php

namespace Database\Factories;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PetRelationship>
 */
class PetRelationshipFactory extends Factory
{
    protected $model = PetRelationship::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'pet_id' => Pet::factory(),
            'relationship_type' => fake()->randomElement(PetRelationshipType::cases()),
            'start_at' => fake()->dateTimeBetween('-2 years', 'now'),
            'end_at' => fake()->optional(0.3)->dateTimeBetween('now', '+1 year'),
            'created_by' => User::factory(),
        ];
    }

    /**
     * Create an active relationship (no end date)
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'end_at' => null,
        ]);
    }

    /**
     * Create an owner relationship
     */
    public function owner(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => PetRelationshipType::OWNER,
        ]);
    }

    /**
     * Create a foster relationship
     */
    public function foster(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => PetRelationshipType::FOSTER,
        ]);
    }

    /**
     * Create an editor relationship
     */
    public function editor(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => PetRelationshipType::EDITOR,
        ]);
    }

    /**
     * Create a viewer relationship
     */
    public function viewer(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => PetRelationshipType::VIEWER,
        ]);
    }
}
