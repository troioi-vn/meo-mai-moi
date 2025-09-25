<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create some sample reviews for testing
        $users = \App\Models\User::factory()->count(10)->create();

        // Create active reviews
        \App\Models\Review::factory()->count(15)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
            'status' => 'active',
        ]);

        // Create some flagged reviews
        \App\Models\Review::factory()->flagged()->count(3)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
        ]);

        // Create some hidden reviews
        \App\Models\Review::factory()->hidden()->count(2)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
        ]);

        $this->command->info('Created sample reviews for testing ReviewResource');
    }
}
