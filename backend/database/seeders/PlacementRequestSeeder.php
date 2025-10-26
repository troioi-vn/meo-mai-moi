<?php

namespace Database\Seeders;

use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlacementRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get any regular user (not admin or super admin)
        $user = User::whereNotIn('email', ['admin@catarchy.space', 'user1@catarchy.space'])->first();

        if ($user) {
            // Use one of the user's existing pets
            $pet = Pet::where('user_id', $user->id)->first();

            if ($pet) {
                PlacementRequest::create([
                    'user_id' => $user->id,
                    'pet_id' => $pet->id,
                    'request_type' => PlacementRequestType::PERMANENT,
                    'status' => \App\Enums\PlacementRequestStatus::OPEN,
                    'notes' => 'Sample placement request for testing',
                    'expires_at' => now()->addMonth(),
                    'start_date' => now()->addWeek(),
                    'end_date' => now()->addMonths(2),
                ]);
            }
        }
    }
}
