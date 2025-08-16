<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Cat;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            UserSeeder::class,
            HelperProfileSeeder::class,
            PlacementRequestSeeder::class,
            ShieldSeeder::class,
            ReviewSeeder::class,
        ]);

        $users = User::where('email', '!=', 'admin@example.com')->get();
        foreach ($users as $user) {
            Cat::factory(3)->create(['user_id' => $user->id]);
        }

        // User::factory(10)->create();
    }
}
