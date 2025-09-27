<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\VaccinationRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VaccinationRecord>
 */
class VaccinationRecordFactory extends Factory
{
    protected $model = VaccinationRecord::class;

    public function definition(): array
    {
        $administered = $this->faker->dateTimeBetween('-2 years', '-1 month');
        $due = (clone $administered)->modify('+1 year');

        return [
            'pet_id' => Pet::factory(),
            'vaccine_name' => $this->faker->randomElement(['Rabies', 'FVRCP', 'FeLV']),
            'administered_at' => $administered,
            'due_at' => $due,
            'notes' => $this->faker->optional()->sentence(8),
            'reminder_sent_at' => null,
        ];
    }
}
