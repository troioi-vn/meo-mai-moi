<?php

namespace Database\Factories;

use App\Enums\PlacementRequestType;
use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class HelperProfileFactory extends Factory
{
    protected $model = HelperProfile::class;

    public function definition()
    {
        // Randomly select 1-3 request types
        $allTypes = array_map(fn ($case) => $case->value, PlacementRequestType::cases());
        $selectedTypes = $this->faker->randomElements($allTypes, $this->faker->numberBetween(1, 3));

        return [
            'user_id' => User::factory(),
            'country' => $this->faker->countryCode(), // ISO 3166-1 alpha-2 code
            'address' => $this->faker->address(),
            'city' => $this->faker->city(),
            'state' => $this->faker->randomElement(['CA', 'NY', 'TX', 'FL', 'IL']),
            'zip_code' => $this->faker->postcode(),
            'phone_number' => $this->faker->phoneNumber(),
            'contact_info' => $this->faker->optional()->sentence(),
            'experience' => $this->faker->paragraph(),
            'has_pets' => $this->faker->boolean(),
            'has_children' => $this->faker->boolean(),
            'request_types' => $selectedTypes,
            'approval_status' => 'approved',
        ];
    }
}
