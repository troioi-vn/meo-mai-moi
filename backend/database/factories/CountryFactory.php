<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Country>
 */
class CountryFactory extends Factory
{
    protected $model = Country::class;

    public function definition(): array
    {
        return [
            'code' => fake()->countryCode(),
            'name' => fake()->country(),
            'phone_prefix' => '+'.(string) fake()->numberBetween(1, 999),
            'is_active' => fake()->boolean(85),
        ];
    }
}
