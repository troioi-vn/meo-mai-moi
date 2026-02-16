<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\Settings;
use App\Services\TelegramWebhookService;
use Filament\Actions\Action;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class TelegramSettings extends Page
{
    public array $data = [];

    protected static ?string $navigationIcon = 'heroicon-o-paper-airplane';

    protected static string $view = 'filament.pages.telegram-settings';

    protected static ?string $slug = 'telegram';

    protected static ?string $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'Telegram';

    protected static ?string $title = 'Telegram';

    protected static ?int $navigationSort = 110;

    public function mount(): void
    {
        if (! auth()->user()->hasRole('super_admin')) {
            abort(403, 'Access denied. Super Admin role required.');
        }

        $this->form->fill([
            'telegram_bot_token' => Settings::get('telegram_bot_token', ''),
            'telegram_bot_username' => Settings::get('telegram_bot_username', ''),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Telegram Notifications')
                    ->description('Configure the Telegram bot for sending notifications to users')
                    ->schema([
                        TextInput::make('telegram_bot_token')
                            ->label('Bot Token')
                            ->helperText('Get this from @BotFather on Telegram. The webhook will be registered automatically when you save a token.')
                            ->password()
                            ->revealable()
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (?string $state): void {
                                $token = $state ?? '';
                                Settings::set('telegram_bot_token', $token);

                                if ($token) {
                                    $result = app(TelegramWebhookService::class)->register($token);

                                    if ($result['ok']) {
                                        Notification::make()
                                            ->title('Telegram Bot Token Updated')
                                            ->body('Webhook registered successfully.')
                                            ->success()
                                            ->send();
                                    } else {
                                        Notification::make()
                                            ->title('Telegram Bot Token Saved')
                                            ->body("Webhook registration failed: {$result['description']}")
                                            ->warning()
                                            ->send();
                                    }
                                } else {
                                    Notification::make()
                                        ->title('Telegram Bot Token Cleared')
                                        ->success()
                                        ->send();
                                }
                            }),

                        TextInput::make('telegram_bot_username')
                            ->label('Bot Username')
                            ->helperText('The bot username without the @ sign (e.g. meo_mai_moi_bot). Used to generate t.me links.')
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (?string $state): void {
                                Settings::set('telegram_bot_username', $state ?? '');

                                Notification::make()
                                    ->title('Telegram Bot Username Updated')
                                    ->success()
                                    ->send();
                            }),
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
                        'telegram_bot_token' => Settings::get('telegram_bot_token', ''),
                        'telegram_bot_username' => Settings::get('telegram_bot_username', ''),
                    ]);

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }
}
