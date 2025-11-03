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

        $adminEmail = env('SEED_ADMIN_EMAIL', 'admin@catarchy.space');
        $adminPassword = env('SEED_ADMIN_PASSWORD', 'password');
        $adminName = env('SEED_ADMIN_NAME', 'Super Admin');

        // Create or update super admin
        $admin = User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => $adminName,
                'password' => Hash::make($adminPassword),
                'email_verified_at' => now(),
            ]
        );

        $adminUpdates = [];

        if ($admin->name !== $adminName) {
            $adminUpdates['name'] = $adminName;
        }

        if (! Hash::check($adminPassword, $admin->password)) {
            $adminUpdates['password'] = Hash::make($adminPassword);
        }

        if (is_null($admin->email_verified_at)) {
            $adminUpdates['email_verified_at'] = now();
        }

        if (! empty($adminUpdates)) {
            $admin->fill($adminUpdates);
            $admin->save();
        }

        if ($superAdminRole && ! $admin->hasRole($superAdminRole)) {
            $admin->assignRole($superAdminRole);
        }

        // Create admin user
        $user1 = User::firstOrCreate(
            ['email' => 'user1@catarchy.space'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $user1->assignRole($adminRole);

        // Create 3 regular users using factory
        for ($i = 1; $i <= 3; $i++) {
            $user = User::factory()->create([
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]);
            if ($viewerRole) {
                $user->assignRole($viewerRole);
            }
        }
    }
}
