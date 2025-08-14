<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Cat;
use App\Models\PlacementRequest;
use App\Enums\PlacementRequestType;

class PlacementRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::where('email', 'user1@example.com')->first();
        $cat = Cat::factory()->create(['user_id' => $user->id]);

        PlacementRequest::factory()->create([
            'user_id' => $user->id,
            'cat_id' => $cat->id,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);
    }
}
