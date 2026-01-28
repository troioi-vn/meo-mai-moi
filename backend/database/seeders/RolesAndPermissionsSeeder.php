<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles (single source of truth)
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $ownerRole = Role::firstOrCreate(['name' => 'owner']);
        $helperRole = Role::firstOrCreate(['name' => 'helper']);
        $viewerRole = Role::firstOrCreate(['name' => 'viewer']);

        // Get all permissions and assign to super_admin
        $allPermissions = Permission::all();
        $superAdminRole->syncPermissions($allPermissions);

        // Admin gets most management permissions
        $adminPermissions = Permission::whereIn('name', [
            // Users
            'view_any_user', 'view_user', 'create_user', 'update_user', 'delete_user', 'delete_any_user',
            // Pets
            'view_any_pet', 'view_pet', 'create_pet', 'update_pet', 'delete_pet', 'delete_any_pet',
            // Pet Types
            'view_any_pet::type', 'view_pet::type', 'create_pet::type', 'update_pet::type', 'delete_pet::type', 'delete_any_pet::type',
            // Helper Profiles
            'view_any_helper::profile', 'view_helper::profile', 'create_helper::profile', 'update_helper::profile', 'delete_helper::profile', 'delete_any_helper::profile',
            // Placement/Transfer
            'view_any_placement::request', 'view_placement::request', 'create_placement::request', 'update_placement::request', 'delete_placement::request',
            'view_any_transfer::request', 'view_transfer::request', 'create_transfer::request', 'update_transfer::request', 'delete_transfer::request',
            // Reviews
            'view_any_review', 'view_review', 'create_review', 'update_review', 'delete_review',
        ])->get();
        $adminRole->syncPermissions($adminPermissions);

        // Owner/helper/viewer: rely primarily on policies; keep permissions minimal by default
        $ownerRole->syncPermissions([]);
        $helperRole->syncPermissions([]);
        $viewerRole->syncPermissions([]);
    }
}
