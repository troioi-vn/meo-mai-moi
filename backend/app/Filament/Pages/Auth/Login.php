<?php

declare(strict_types=1);

namespace App\Filament\Pages\Auth;

use Filament\Forms\Components\Component;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Auth\Login as BaseLogin;

class Login extends BaseLogin
{
    protected function getEmailFormComponent(): Component
    {
        return TextInput::make('email')
            ->label(__('filament-panels::pages/auth/login.form.email.label'))
            ->email()
            ->required()
            // Browsers/password managers expect a login identifier to use `autocomplete="username"`.
            // Filament inputs are Livewire-driven and don't render a `name` attribute by default,
            // so we explicitly set one to enable autofill.
            ->autocomplete('username')
            ->autofocus()
            ->extraInputAttributes([
                'name' => 'email',
                'tabindex' => 1,
            ]);
    }

    protected function getPasswordFormComponent(): Component
    {
        $component = parent::getPasswordFormComponent();

        if ($component instanceof TextInput) {
            $component->extraInputAttributes([
                'name' => 'password',
            ]);
        }

        return $component;
    }
}
