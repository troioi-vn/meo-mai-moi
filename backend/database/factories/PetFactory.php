<?php

namespace Database\Factories;

use App\Enums\PetStatus;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
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
        $precision = $this->faker->randomElement([
            'day', 'day', 'day', 'day', // weight day ~40%
            'month', 'month', 'month', // month ~30%
            'year', 'year',           // year ~20%
            'unknown',                // unknown ~10%
        ]);

        $year = $this->faker->numberBetween(now()->year - 15, now()->year - 1);
        $month = $this->faker->numberBetween(1, 12);
        $day = $this->faker->numberBetween(1, 28); // keep simple for validity

        $birthday = null;
        $birthday_year = null;
        $birthday_month = null;
        $birthday_day = null;
        if ($precision === 'day') {
            $birthday_year = $year;
            $birthday_month = $month;
            $birthday_day = $day;
            $birthday = sprintf('%04d-%02d-%02d', $year, $month, $day);
        } elseif ($precision === 'month') {
            $birthday_year = $year;
            $birthday_month = $month;
        } elseif ($precision === 'year') {
            $birthday_year = $year;
        }

        return [
            'name' => $this->faker->firstName(),
            'breed' => $this->faker->randomElement([
                'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll',
                'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle',
            ]),
            'birthday' => $birthday,
            'birthday_year' => $birthday_year,
            'birthday_month' => $birthday_month,
            'birthday_day' => $birthday_day,
            'birthday_precision' => $precision,
            'location' => $this->faker->city(),
            'description' => $this->faker->paragraph(),
            'status' => PetStatus::ACTIVE,
            'user_id' => User::factory(),
            'pet_type_id' => function () {
                $existing = PetType::first();
                if ($existing) {
                    return $existing->id;
                }

                return PetType::create([
                    'name' => 'Cat',
                    'slug' => 'cat',
                    'description' => 'Default cat type (auto-created by factory)',
                    'status' => \App\Enums\PetTypeStatus::ACTIVE,
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
                'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll',
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
                'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle',
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
