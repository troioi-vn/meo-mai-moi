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

        $adminEmail = config('seeder.admin_email');
        $adminPassword = config('seeder.admin_password');
        $adminName = config('seeder.admin_name');
        $demoEmail = config('demo.user_email');
        $demoName = config('demo.user_name');
        $demoPassword = config('demo.user_password');

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
        $user1 = User::updateOrCreate(
            ['email' => 'user1@catarchy.space'],
            [
                'name' => 'Support 🐱',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $user1->assignRole($adminRole);

        User::updateOrCreate(
            ['email' => 'invitee@catarchy.space'],
            [
                'name' => 'Trusted Friend',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'telegram_5612904335@telegram.meo-mai-moi.local'],
            [
                'name' => 'Telegram Placeholder User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $demoUser = User::updateOrCreate(
            ['email' => $demoEmail],
            [
                'name' => $demoName,
                'password' => Hash::make($demoPassword),
                'email_verified_at' => now(),
            ]
        );

        $demoUpdates = [];

        if ($demoUser->name !== $demoName) {
            $demoUpdates['name'] = $demoName;
        }

        if (! Hash::check($demoPassword, $demoUser->password)) {
            $demoUpdates['password'] = Hash::make($demoPassword);
        }

        if (is_null($demoUser->email_verified_at)) {
            $demoUpdates['email_verified_at'] = now();
        }

        if ($demoUser->locale !== 'en') {
            $demoUpdates['locale'] = 'en';
        }

        if (! empty($demoUpdates)) {
            $demoUser->fill($demoUpdates);
            $demoUser->save();
        }

        // Create 3 regular users using factory
        for ($i = 1; $i <= 3; $i++) {
            User::factory()->create([
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]);
        }
    }
}
