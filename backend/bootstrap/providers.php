<?php

use App\Providers\AppServiceProvider;
use App\Providers\Filament\AdminPanelProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\JetstreamServiceProvider;

$providers = [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    JetstreamServiceProvider::class,
];

if (! filter_var(env('DISABLE_ADMIN_PANEL', false), FILTER_VALIDATE_BOOLEAN)) {
    $providers[] = AdminPanelProvider::class;
}

return $providers;
