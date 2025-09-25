<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransferRequestFactory extends Factory
{
    protected $model = TransferRequest::class;

    public function definition(): array
    {
        return [
            'pet_id' => Pet::factory(),
            'initiator_user_id' => User::factory(),
            'recipient_user_id' => User::factory(),
            'status' => $this->faker->randomElement(['pending', 'accepted', 'rejected']),
            'requested_relationship_type' => $this->faker->randomElement(['fostering', 'permanent_foster']),
            'helper_profile_id' => \App\Models\HelperProfile::factory(),
            'requester_id' => User::factory(),
        ];
    }
}
