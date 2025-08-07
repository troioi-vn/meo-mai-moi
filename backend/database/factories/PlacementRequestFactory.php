<?php

namespace Database\Factories;

use App\Models\PlacementRequest;
use App\Models\Cat;
use App\Models\User;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementRequestStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlacementRequestFactory extends Factory
{
    protected $model = PlacementRequest::class;

    public function definition()
    {
        return [
            'cat_id' => Cat::factory(),
            'user_id' => User::factory(),
            'request_type' => $this->faker->randomElement(PlacementRequestType::cases())->value,
            'status' => $this->faker->randomElement(PlacementRequestStatus::cases())->value,
            'expires_at' => $this->faker->dateTimeBetween('+1 week', '+1 month'),
            'is_active' => true,
        ];
    }
}