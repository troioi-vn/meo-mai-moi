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
        // Use existing users for reviews
        $users = \App\Models\User::all();
        
        if ($users->count() < 2) {
            $this->command->info('Not enough users to create reviews');
            return;
        }

        // Create active reviews using existing users
        \App\Models\Review::factory()->count(5)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
            'status' => 'active',
        ]);

        // Create some flagged reviews
        \App\Models\Review::factory()->flagged()->count(2)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
        ]);

        // Create some hidden reviews
        \App\Models\Review::factory()->hidden()->count(1)->create([
            'reviewer_user_id' => $users->random()->id,
            'reviewed_user_id' => $users->random()->id,
            'moderated_by' => $users->random()->id,
        ]);

        $this->command->info('Created sample reviews for testing ReviewResource');
    }
}
