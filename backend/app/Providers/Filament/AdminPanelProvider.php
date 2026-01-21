<?php

declare(strict_types=1);

namespace App\Providers\Filament;

use App\Filament\Resources\UserResource\Actions\ImpersonateAsUser;
use BezhanSalleh\FilamentShield\FilamentShieldPlugin;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use TomatoPHP\FilamentUsers\FilamentUsersPlugin;
use TomatoPHP\FilamentUsers\Resources\UserResource\Table\UserActions as FilamentUserActions;

class AdminPanelProvider extends PanelProvider
{
    public function boot(): void
    {
        // Register a custom impersonate action that redirects to / and stores a back link to the admin panel
        if (class_exists(FilamentUserActions::class) && class_exists(ImpersonateAsUser::class)) {
            FilamentUserActions::register(ImpersonateAsUser::make());
        }
    }

    public function panel(Panel $panel): Panel
    {
        $panel = $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login(\App\Filament\Pages\Auth\Login::class)
            ->homeUrl('/')
            ->colors([
                'primary' => Color::Amber,
            ])
            ->plugin(FilamentUsersPlugin::make());

        // Register Filament Shield only outside of the test environment to simplify test access
        if (! app()->environment('testing')) {
            $panel->plugin(FilamentShieldPlugin::make());
        }

        return $panel
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                Widgets\AccountWidget::class,
                Widgets\FilamentInfoWidget::class,
            ])
            ->navigationGroups([
                'Pet Management',
                'Users & Helpers',
                'Invitation',
                'Communication',
                'System',
            ])
            ->collapsibleNavigationGroups(false)
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
