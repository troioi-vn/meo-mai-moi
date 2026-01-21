<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\WeightHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WeightHistory>
 */
class WeightHistoryFactory extends Factory
{
    protected $model = WeightHistory::class;

    public function definition(): array
    {
        return [
            'pet_id' => Pet::factory(),
            'weight_kg' => $this->faker->randomFloat(2, 3, 15),
            'record_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
