<?php

namespace Database\Factories;

use App\Enums\PlacementResponseStatus;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlacementRequestResponseFactory extends Factory
{
    protected $model = PlacementRequestResponse::class;

    public function definition(): array
    {
        return [
            'placement_request_id' => PlacementRequest::factory(),
            'helper_profile_id' => HelperProfile::factory(),
            'status' => PlacementResponseStatus::RESPONDED,
            'message' => $this->faker->optional()->paragraph(),
            'responded_at' => now(),
            'accepted_at' => null,
            'rejected_at' => null,
            'cancelled_at' => null,
        ];
    }

    /**
     * Configure the response as accepted.
     */
    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PlacementResponseStatus::ACCEPTED,
            'accepted_at' => now(),
        ]);
    }

    /**
     * Configure the response as rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PlacementResponseStatus::REJECTED,
            'rejected_at' => now(),
        ]);
    }

    /**
     * Configure the response as cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PlacementResponseStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);
    }
}
