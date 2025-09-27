<?php

namespace Database\Factories;

<<<<<<<< HEAD:backend/database/factories/PetTypeFactory.php
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PetType>
 */
class PetTypeFactory extends Factory
========
use App\Models\MedicalNote;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MedicalNote>
 */
class MedicalNoteFactory extends Factory
>>>>>>>> dev:backend/database/factories/MedicalNoteFactory.php
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
<<<<<<<< HEAD:backend/database/factories/PetTypeFactory.php
            'name' => $this->faker->word,
            'slug' => $this->faker->slug,
            'description' => $this->faker->sentence,
            'is_active' => true,
            'is_system' => false,
            'display_order' => 0,
            'placement_requests_allowed' => false,
========
            'pet_id' => Pet::factory(),
            'record_date' => $this->faker->dateTimeBetween('-3 years', 'now'),
            'note' => $this->faker->sentence(12),
>>>>>>>> dev:backend/database/factories/MedicalNoteFactory.php
        ];
    }
}
