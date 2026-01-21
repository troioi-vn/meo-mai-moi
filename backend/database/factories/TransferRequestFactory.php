<?php

namespace Database\Factories;

use App\Enums\TransferRequestStatus;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransferRequestFactory extends Factory
{
    protected $model = TransferRequest::class;

    public function definition(): array
    {
        return [
            'placement_request_id' => PlacementRequest::factory(),
            'placement_request_response_id' => PlacementRequestResponse::factory(),
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'status' => TransferRequestStatus::PENDING->value,
        ];
    }

    /**
     * Indicate that the transfer is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TransferRequestStatus::PENDING->value,
            'confirmed_at' => null,
            'rejected_at' => null,
        ]);
    }

    /**
     * Indicate that the transfer is confirmed.
     */
    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TransferRequestStatus::CONFIRMED->value,
            'confirmed_at' => now(),
            'rejected_at' => null,
        ]);
    }

    /**
     * Indicate that the transfer is rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TransferRequestStatus::REJECTED->value,
            'confirmed_at' => null,
            'rejected_at' => now(),
        ]);
    }
}
