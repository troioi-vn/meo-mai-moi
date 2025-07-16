<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $userRole = Role::firstOrCreate(['name' => 'user']);

        // Get all permissions and assign to super_admin
        $allPermissions = Permission::all();
        $superAdminRole->syncPermissions($allPermissions);

        // Assign specific permissions to admin role
        $adminPermissions = Permission::whereIn('name', [
            'view_any_user',
            'view_user',
            'create_user',
            'update_user',
            'delete_user',
        ])->get();
        $adminRole->syncPermissions($adminPermissions);

        // Create or update test user with super admin role
        $testUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password'),
                'role' => 'admin',
            ]
        );
        
        $testUser->assignRole('super_admin');

        echo "Roles and permissions seeded successfully!\n";
        echo "Test user created with email: test@example.com and password: password\n";
    }
}
