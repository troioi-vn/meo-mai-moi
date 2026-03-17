<?php

use App\Models\User;
use Spatie\Permission\Models\Role;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Pages\CreateUser;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Pages\EditUser;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Pages\ListUsers;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Pages\ViewUser;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Schemas\UserForm;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Schemas\UserInfolist;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Tables\UserActions;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Tables\UserBulkActions;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Tables\UserFilters;
use TomatoPHP\FilamentUsers\Filament\Resources\Users\Tables\UsersTable;

return [
    /**
     * ---------------------------------------------
     * Publish Resource
     * ---------------------------------------------
     * The resource that will be used for the user management.
     * If you want to use your own resource, you can set this to true.
     * and use `php artisan filament-user:publish` to publish the resource.
     */
    'publish_resource' => true,

    /**
     * ---------------------------------------------
     * Change The Group Name And Override Translated One
     * ---------------------------------------------
     * The Group name of the resource.
     */
    'group' => 'Users & Helpers',

    /**
     * ---------------------------------------------
     * User Filament Impersonate
     * ---------------------------------------------
     * if you are using filament impersonate, you can set this to true.
     */
    'impersonate' => true,

    /**
     * ---------------------------------------------
     * User Filament Shield
     * ---------------------------------------------
     *  if you are using filament shield, you can set this to true.
     */
    'shield' => true,

    /**
     * ---------------------------------------------
     * Use Simple Resource
     * ---------------------------------------------
     * change the resource from pages to modals by allow simple resource.
     */
    'simple' => true,

    /**
     * ---------------------------------------------
     * Use Teams
     * ---------------------------------------------
     * if you want to allow team resource and filters and actions.
     */
    'teams' => false,

    /**
     * ---------------------------------------------
     * User Model
     * ---------------------------------------------
     * if you when to custom the user model path
     */
    'model' => User::class,

    /**
     * ---------------------------------------------
     * Team Model
     * ---------------------------------------------
     * if you when to custom the team model path
     */
    'team_model' => null, // \App\Models\Team::class,

    /**
     * ---------------------------------------------
     * Role Model
     * ---------------------------------------------
     * if you when to custom the role model path
     */
    'roles_model' => Role::class,

    /**
     * ---------------------------------------------
     * Resource Building
     * ---------------------------------------------
     * if you want to use the resource custom class
     */
    'resource' => [
        'table' => [
            'class' => UsersTable::class,
            'filters' => UserFilters::class,
            'actions' => UserActions::class,
            'bulkActions' => UserBulkActions::class,
        ],
        'form' => [
            'class' => UserForm::class,
        ],
        'infolist' => [
            'class' => UserInfolist::class,
        ],
        'pages' => [
            'list' => ListUsers::class,
            'create' => CreateUser::class,
            'edit' => EditUser::class,
            'view' => ViewUser::class,
        ],
    ],
];
