<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdminRole = Role::where('name', 'super_admin')->first();
        $adminRole = Role::where('name', 'admin')->first();
        $viewerRole = Role::where('name', 'viewer')->first();

        $admin = User::firstOrCreate(
            ['email' => 'admin@catarchy.space'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
            ]
        );
        $admin->assignRole($superAdminRole);

        $user1 = User::firstOrCreate(
            ['email' => 'user1@catarchy.space'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
            ]
        );
        $user1->assignRole($adminRole);

        $user2 = User::firstOrCreate(
            ['email' => 'user2@catarchy.space'],
            [
                'name' => 'Regular User',
                'password' => Hash::make('password'),
            ]
        );
        if ($viewerRole) {
            $user2->assignRole($viewerRole);
        }
    }
}
