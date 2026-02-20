<?php

declare(strict_types=1);

namespace App\Filament\Pages\Auth;

use Filament\Auth\Pages\Login as BaseLogin;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Component;

class Login extends BaseLogin
{
    protected function getEmailFormComponent(): Component
    {
        return TextInput::make('email')
            ->label(__('filament-panels::auth/pages/login.form.email.label'))
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
