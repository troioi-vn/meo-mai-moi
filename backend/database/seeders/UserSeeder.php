<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdminRole = Role::where('name', 'super_admin')->first();
        $adminRole = Role::where('name', 'admin')->first();
        $userRole = Role::where('name', 'user')->first();

        $admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@catarchy.space',
            'password' => Hash::make('password'),
        ]);
        $admin->assignRole($superAdminRole);

        $user1 = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'user1@catarchy.space',
            'password' => Hash::make('password'),
        ]);
        $user1->assignRole($adminRole);

        $user2 = User::factory()->create([
            'name' => 'Regular User',
            'email' => 'user2@catarchy.space',
            'password' => Hash::make('password'),
        ]);
        $user2->assignRole($userRole);
    }
}