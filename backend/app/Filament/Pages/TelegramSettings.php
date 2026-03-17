<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class TelegramSettings extends Page
{
    public array $data = [];

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-paper-airplane';

    protected string $view = 'filament.pages.telegram-settings';

    protected static ?string $slug = 'telegram';

    protected static string|\UnitEnum|null $navigationGroup = 'Configuration';

    protected static ?string $navigationLabel = 'Telegram';

    protected static ?string $title = 'Telegram';

    protected static ?int $navigationSort = 2;

    public function mount(): void
    {
        if (! auth()->user()->hasRole('super_admin')) {
            abort(403, 'Access denied. Super Admin role required.');
        }

        $this->form->fill([
            'telegram_bot_token' => $this->maskedToken(),
            'telegram_bot_username' => $this->configuredUsername(),
        ]);
    }

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Section::make('Telegram User Bot')
                    ->description('This bot is configured from backend/.env for the current environment and is read-only in admin.')
                    ->schema([
                        TextInput::make('telegram_bot_token')
                            ->label('Bot Token')
                            ->helperText('Set TELEGRAM_USER_BOT_TOKEN in backend/.env for this environment.')
                            ->disabled()
                            ->dehydrated(false),

                        TextInput::make('telegram_bot_username')
                            ->label('Bot Username')
                            ->helperText('Set TELEGRAM_USER_BOT_USERNAME in backend/.env for this environment.')
                            ->disabled()
                            ->dehydrated(false),
                    ])
                    ->columns(1),
            ])
            ->statePath('data');
    }

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole('super_admin');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('refresh')
                ->label('Refresh Settings')
                ->icon('heroicon-m-arrow-path')
                ->action(function (): void {
                    $this->form->fill([
                        'telegram_bot_token' => $this->maskedToken(),
                        'telegram_bot_username' => $this->configuredUsername(),
                    ]);

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }

    private function configuredUsername(): string
    {
        $username = config('telegram.user_bot.username');

        return is_string($username) ? ltrim(trim($username), '@') : '';
    }

    private function maskedToken(): string
    {
        $token = config('telegram.user_bot.token');

        if (! is_string($token) || $token === '') {
            return '';
        }

        if (strlen($token) <= 10) {
            return str_repeat('*', strlen($token));
        }

        return substr($token, 0, 6).'...'.substr($token, -4);
    }
}
