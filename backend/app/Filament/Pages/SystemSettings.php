<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Services\SettingsService;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SystemSettings extends Page
{
    public array $data = [];

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected string $view = 'filament.pages.system-settings';

    protected static string|\UnitEnum|null $navigationGroup = 'Configuration';

    protected static ?string $navigationLabel = 'System Settings';

    protected static ?string $title = 'System Settings';

    protected static ?int $navigationSort = 3;

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
            'storage_limit_default_mb' => $this->settingsService->getDefaultStorageLimitMb(),
            'storage_limit_premium_mb' => $this->settingsService->getPremiumStorageLimitMb(),
        ]);
    }

    public function form(Schema $form): Schema
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
                Section::make('Storage Limits')
                    ->description('Set the maximum photo storage available to users by account role')
                    ->schema([
                        TextInput::make('storage_limit_default_mb')
                            ->label('Default user storage limit')
                            ->helperText('Applies to users without the premium role.')
                            ->numeric()
                            ->minValue(1)
                            ->suffix('MB')
                            ->live(onBlur: true)
                            ->afterStateUpdated(function ($state): void {
                                $value = max(1, (int) $state);
                                $this->settingsService->configureDefaultStorageLimitMb($value);

                                Notification::make()
                                    ->title('Default Storage Limit Updated')
                                    ->body("Users without premium now have {$value} MB of storage.")
                                    ->success()
                                    ->send();
                            }),
                        TextInput::make('storage_limit_premium_mb')
                            ->label('Premium user storage limit')
                            ->helperText('Applies to users with the premium role.')
                            ->numeric()
                            ->minValue(1)
                            ->suffix('MB')
                            ->live(onBlur: true)
                            ->afterStateUpdated(function ($state): void {
                                $value = max(1, (int) $state);
                                $this->settingsService->configurePremiumStorageLimitMb($value);

                                Notification::make()
                                    ->title('Premium Storage Limit Updated')
                                    ->body("Premium users now have {$value} MB of storage.")
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
                        'storage_limit_default_mb' => $this->settingsService->getDefaultStorageLimitMb(),
                        'storage_limit_premium_mb' => $this->settingsService->getPremiumStorageLimitMb(),
                    ]);

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }
}
