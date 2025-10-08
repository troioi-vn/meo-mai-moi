<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\PetMicrochip;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PetMicrochip>
 */
class PetMicrochipFactory extends Factory
{
    protected $model = PetMicrochip::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'pet_id' => Pet::factory(),
            'chip_number' => $this->faker->unique()->numerify('############'),
            'issuer' => $this->faker->randomElement(['HomeAgain', 'AKC Reunite', 'Found Animals', null]),
            'implanted_at' => $this->faker->boolean(80) ? $this->faker->dateTimeBetween('-5 years', 'now')->format('Y-m-d') : null,
        ];
    }

    /**
     * Create a microchip with a specific chip number.
     */
    public function withChipNumber(string $chipNumber): static
    {
        return $this->state(fn (array $attributes) => [
            'chip_number' => $chipNumber,
        ]);
    }

    /**
     * Create a microchip with a specific issuer.
     */
    public function withIssuer(string $issuer): static
    {
        return $this->state(fn (array $attributes) => [
            'issuer' => $issuer,
        ]);
    }
}