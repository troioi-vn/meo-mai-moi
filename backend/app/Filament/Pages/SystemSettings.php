<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Services\SettingsService;
use Filament\Actions\Action;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class SystemSettings extends Page
{
    public array $data = [];

    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string $view = 'filament.pages.system-settings';

    protected static ?string $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'Configuration';

    protected static ?string $title = 'Configuration';

    protected static ?int $navigationSort = 100;

    private SettingsService $settingsService;

    public function boot(): void
    {
        $this->settingsService = app(SettingsService::class);
    }

    public function mount(): void
    {
        // Check if user has super_admin role
        if (! auth()->user()->hasRole('super_admin')) {
            abort(403, 'Access denied. Super Admin role required.');
        }

        // Initialize form data with current settings
        $this->form->fill([
            'invite_only_enabled' => $this->settingsService->isInviteOnlyEnabled(),
            'email_verification_required' => $this->settingsService->isEmailVerificationRequired(),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Registration Settings')
                    ->description('Control how users can register for the platform')
                    ->schema([
                        Toggle::make('invite_only_enabled')
                            ->label('Enable Invite-Only Registration')
                            ->helperText('When enabled, only users with valid invitation codes can register. Others can join the waitlist.')
                            ->live()
                            ->afterStateUpdated(function (bool $state): void {
                                $this->settingsService->configureInviteOnlyMode($state);

                                $message = $state
                                    ? 'Invite-only registration enabled. New users must have invitation codes.'
                                    : 'Open registration enabled. Anyone can register freely.';

                                Notification::make()
                                    ->title('Registration Mode Updated')
                                    ->body($message)
                                    ->success()
                                    ->send();
                            }),

                        Toggle::make('email_verification_required')
                            ->label('Require Email Verification')
                            ->helperText('When enabled, users must verify their email address before accessing the application.')
                            ->live()
                            ->afterStateUpdated(function (bool $state): void {
                                $this->settingsService->configureEmailVerificationRequirement($state);

                                $message = $state
                                    ? 'Email verification is now required for all new registrations.'
                                    : 'Email verification is now optional. Users can access the app immediately.';

                                Notification::make()
                                    ->title('Email Verification Setting Updated')
                                    ->body($message)
                                    ->success()
                                    ->send();
                            }),
                    ])
                    ->columns(1),
            ])
            ->statePath('data');
    }

    /**
     * Determine if the user can access this page
     */
    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole('super_admin');
    }

    /**
     * Get navigation badge (show current status)
     */
    public static function getNavigationBadge(): ?string
    {
        $settingsService = app(SettingsService::class);

        return $settingsService->isInviteOnlyEnabled() ? 'Invite Only' : 'Open';
    }

    /**
     * Get navigation badge color
     */
    public static function getNavigationBadgeColor(): ?string
    {
        $settingsService = app(SettingsService::class);

        return $settingsService->isInviteOnlyEnabled() ? 'warning' : 'success';
    }

    /**
     * Check if invite-only mode is currently enabled
     * This method is used in the Blade view
     */
    public function getInviteOnlyEnabledProperty(): bool
    {
        return $this->settingsService->isInviteOnlyEnabled();
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('refresh')
                ->label('Refresh Settings')
                ->icon('heroicon-m-arrow-path')
                ->action(function (): void {
                    $this->form->fill([
                        'invite_only_enabled' => $this->settingsService->isInviteOnlyEnabled(),
                        'email_verification_required' => $this->settingsService->isEmailVerificationRequired(),
                    ]);

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }
}
