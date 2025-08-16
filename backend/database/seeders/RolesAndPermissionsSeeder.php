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

        echo "Roles and permissions seeded successfully!\n";
    }
}
