<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Enums\PetStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Pet>
 */
class PetFactory extends Factory
{
    protected $model = Pet::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->firstName(),
            'breed' => $this->faker->randomElement([
                'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll',
                'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle'
            ]),
            'birthday' => $this->faker->dateTimeBetween('-10 years', '-1 year'),
            'location' => $this->faker->city(),
            'description' => $this->faker->paragraph(),
            'status' => PetStatus::ACTIVE,
            'user_id' => User::factory(),
            'pet_type_id' => function () {
                // Default to an existing 'cat' pet type or create one if none exists
                $existing = PetType::first();
                if ($existing) {
                    return $existing->id;
                }
                return PetType::create([
                    'name' => 'Cat',
                    'slug' => 'cat',
                    'description' => 'Default cat type (auto-created by factory)',
                    'is_active' => true,
                    'is_system' => true,
                    'display_order' => 1,
                ])->id;
            },
        ];
    }

    /**
     * Indicate that the pet is a cat.
     */
    public function cat(): static
    {
        return $this->state(fn (array $attributes) => [
            'pet_type_id' => 1, // Cat
            'breed' => $this->faker->randomElement([
                'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll'
            ]),
        ]);
    }

    /**
     * Indicate that the pet is a dog.
     */
    public function dog(): static
    {
        return $this->state(fn (array $attributes) => [
            'pet_type_id' => 2, // Dog
            'breed' => $this->faker->randomElement([
                'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle'
            ]),
        ]);
    }

    /**
     * Indicate that the pet is lost.
     */
    public function lost(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PetStatus::LOST,
        ]);
    }
}