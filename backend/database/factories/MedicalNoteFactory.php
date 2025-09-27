<?php

namespace Database\Factories;

<<<<<<<< HEAD:backend/database/factories/MedicalNoteFactory.php
use App\Models\MedicalNote;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MedicalNote>
 */
class MedicalNoteFactory extends Factory
========
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PetType>
 */
class PetTypeFactory extends Factory
>>>>>>>> origin/main:backend/database/factories/PetTypeFactory.php
{
    protected $model = MedicalNote::class;
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
<<<<<<<< HEAD:backend/database/factories/MedicalNoteFactory.php
            'pet_id' => Pet::factory(),
            'record_date' => $this->faker->dateTimeBetween('-3 years', 'now'),
            'note' => $this->faker->sentence(12),
========
            'name' => $this->faker->word,
            'slug' => $this->faker->slug,
            'description' => $this->faker->sentence,
            'is_active' => true,
            'is_system' => false,
            'display_order' => 0,
            'placement_requests_allowed' => false,
>>>>>>>> origin/main:backend/database/factories/PetTypeFactory.php
        ];
    }
}
