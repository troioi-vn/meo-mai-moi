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

        $users = User::all();
        foreach ($users as $user) {
            Cat::factory(2)->create(['user_id' => $user->id]);
        }
    }
}
