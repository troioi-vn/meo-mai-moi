<?php

namespace Database\Seeders;

use BezhanSalleh\FilamentShield\Support\Utils;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class ShieldSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $rolesWithPermissions = '[{"name":"super_admin","guard_name":"web","permissions":["view_pet","view_any_pet","create_pet","update_pet","restore_pet","restore_any_pet","replicate_pet","reorder_pet","delete_pet","delete_any_pet","force_delete_pet","force_delete_any_pet","view_helper::profile","view_any_helper::profile","create_helper::profile","update_helper::profile","restore_helper::profile","restore_any_helper::profile","replicate_helper::profile","reorder_helper::profile","delete_helper::profile","delete_any_helper::profile","force_delete_helper::profile","force_delete_any_helper::profile","view_pet::type","view_any_pet::type","create_pet::type","update_pet::type","restore_pet::type","restore_any_pet::type","replicate_pet::type","reorder_pet::type","delete_pet::type","delete_any_pet::type","force_delete_pet::type","force_delete_any_pet::type","view_placement::request","view_any_placement::request","create_placement::request","update_placement::request","restore_placement::request","restore_any_placement::request","replicate_placement::request","reorder_placement::request","delete_placement::request","delete_any_placement::request","force_delete_placement::request","force_delete_any_placement::request","view_review","view_any_review","create_review","update_review","restore_review","restore_any_review","replicate_review","reorder_review","delete_review","delete_any_review","force_delete_review","force_delete_any_review","view_role","view_any_role","create_role","update_role","delete_role","delete_any_role","view_transfer::request","view_any_transfer::request","create_transfer::request","update_transfer::request","restore_transfer::request","restore_any_transfer::request","replicate_transfer::request","reorder_transfer::request","delete_transfer::request","delete_any_transfer::request","force_delete_transfer::request","force_delete_any_transfer::request","view_user","view_any_user","create_user","update_user","restore_user","restore_any_user","replicate_user","reorder_user","delete_user","delete_any_user","force_delete_user","force_delete_any_user","view_notification::template","view_any_notification::template","create_notification::template","update_notification::template","restore_notification::template","restore_any_notification::template","replicate_notification::template","reorder_notification::template","delete_notification::template","delete_any_notification::template","force_delete_notification::template","force_delete_any_notification::template"]}]';
        $directPermissions = '[]';

        static::makeRolesWithPermissions($rolesWithPermissions);
        static::makeDirectPermissions($directPermissions);

        $this->command->info('Shield Seeding Completed.');
    }

    protected static function makeRolesWithPermissions(string $rolesWithPermissions): void
    {
        if (! blank($rolePlusPermissions = json_decode($rolesWithPermissions, true))) {
            /** @var class-string<\Illuminate\Database\Eloquent\Model> $roleModel */
            $roleModel = Utils::getRoleModel();
            /** @var class-string<\Illuminate\Database\Eloquent\Model> $permissionModel */
            $permissionModel = Utils::getPermissionModel();

            foreach ($rolePlusPermissions as $rolePlusPermission) {
                /** @var \Spatie\Permission\Models\Role $role */
                $role = $roleModel::firstOrCreate([
                    'name' => $rolePlusPermission['name'],
                    'guard_name' => $rolePlusPermission['guard_name'],
                ]);

                if (! blank($rolePlusPermission['permissions'])) {
                    $permissionModels = collect($rolePlusPermission['permissions'])
                        ->map(fn ($permission) => $permissionModel::firstOrCreate([
                            'name' => $permission,
                            'guard_name' => $rolePlusPermission['guard_name'],
                        ]))
                        ->all();

                    $role->syncPermissions($permissionModels);
                }
            }
        }
    }

    public static function makeDirectPermissions(string $directPermissions): void
    {
        if (! blank($permissions = json_decode($directPermissions, true))) {
            /** @var class-string<\Illuminate\Database\Eloquent\Model> $permissionModel */
            $permissionModel = Utils::getPermissionModel();

            foreach ($permissions as $permission) {
                if ($permissionModel::whereName($permission)->doesntExist()) {
                    $permissionModel::create([
                        'name' => $permission['name'],
                        'guard_name' => $permission['guard_name'],
                    ]);
                }
            }
        }
    }
}
