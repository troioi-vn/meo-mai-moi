<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\HelperProfile;

class HelperProfileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::where('email', '!=', 'admin@example.com')->get();

        foreach ($users as $user) {
            HelperProfile::factory()->create(['user_id' => $user->id]);
        }
    }
}
