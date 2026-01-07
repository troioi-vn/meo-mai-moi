<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $plainPassword = $input['password'];

        // Log before setting password
        Log::info('ResetUserPassword: Before setting password', [
            'user_id' => $user->id,
            'email' => $user->email,
            'password_length' => strlen($plainPassword),
            'current_password_hash' => $user->password ? substr($user->password, 0, 20) . '...' : 'null',
        ]);

        // Update password and remember token
        // The 'hashed' cast on User model will automatically hash the password
        $user->forceFill([
            'password' => $plainPassword,
        ])->setRememberToken(Str::random(60));

        // Log after setting password (before save)
        $newHash = $user->password;
        Log::info('ResetUserPassword: After forceFill, before save', [
            'user_id' => $user->id,
            'new_password_hash_prefix' => substr($newHash, 0, 20) . '...',
            'hash_check_result' => Hash::check($plainPassword, $newHash),
        ]);

        $user->save();

        // Refresh and verify
        $user->refresh();
        Log::info('ResetUserPassword: After save and refresh', [
            'user_id' => $user->id,
            'saved_password_hash_prefix' => substr($user->password, 0, 20) . '...',
            'hash_check_after_save' => Hash::check($plainPassword, $user->password),
        ]);

        // Fire the PasswordReset event (maintains existing behavior and integrations)
        event(new PasswordReset($user));
    }
}
