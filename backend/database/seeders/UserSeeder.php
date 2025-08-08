<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('name', 'admin')->first();
        $userRole = Role::where('name', 'user')->first();

        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);
        $admin->assignRole($adminRole);

        $user1 = User::factory()->create([
            'name' => 'Test User 1',
            'email' => 'user1@example.com',
        ]);
        $user1->assignRole($userRole);

        $user2 = User::factory()->create([
            'name' => 'Test User 2',
            'email' => 'user2@example.com',
        ]);
        $user2->assignRole($userRole);
    }
}
