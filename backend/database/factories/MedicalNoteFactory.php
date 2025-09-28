<?php

namespace Database\Factories;

use App\Models\MedicalNote;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MedicalNote>
 */
class MedicalNoteFactory extends Factory
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
            'pet_id' => Pet::factory(),
            'record_date' => $this->faker->dateTimeBetween('-3 years', 'now'),
            'note' => $this->faker->sentence(12),
        ];
    }
}
