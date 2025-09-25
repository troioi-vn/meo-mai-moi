<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Enums\PlacementRequestType;

class PlacementRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::where('email', 'user2@catarchy.space')->first();
        $pet = Pet::factory()->create(['user_id' => $user->id]);

        PlacementRequest::factory()->create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);
    }
}
