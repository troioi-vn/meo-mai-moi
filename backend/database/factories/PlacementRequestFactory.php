<?php

namespace Database\Factories;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlacementRequestFactory extends Factory
{
    protected $model = PlacementRequest::class;

    public function definition()
    {
        return [
            'pet_id' => Pet::factory(),
            'user_id' => User::factory(),
            'request_type' => $this->faker->randomElement(PlacementRequestType::cases()),
            'status' => PlacementRequestStatus::OPEN,
            'notes' => $this->faker->paragraph(),
            'expires_at' => $this->faker->dateTimeBetween('+1 week', '+1 month'),
            'start_date' => $this->faker->dateTimeBetween('now', '+1 week'),
            'end_date' => $this->faker->dateTimeBetween('+1 month', '+2 months'),
            'is_active' => true,
        ];
    }
}
