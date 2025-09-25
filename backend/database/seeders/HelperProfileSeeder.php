<?php

namespace Database\Seeders;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

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
