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
            'view_any_user','view_user','create_user','update_user','delete_user','delete_any_user',
            // Cats
            'view_any_cat','view_cat','create_cat','update_cat','delete_cat','delete_any_cat',
            // Placement/Transfer
            'view_any_placement::request','view_placement::request','update_placement::request','delete_placement::request',
            'view_any_transfer::request','view_transfer::request','update_transfer::request','delete_transfer::request',
        ])->get();
        $adminRole->syncPermissions($adminPermissions);

    // Owner/helper/viewer: rely primarily on policies; keep permissions minimal by default
    $ownerRole->syncPermissions([]);
    $helperRole->syncPermissions([]);
    $viewerRole->syncPermissions([]);
    }
}
