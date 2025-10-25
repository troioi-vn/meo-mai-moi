<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
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

        // Update password and remember token (matching existing behavior)
        $user->forceFill([
            'password' => Hash::make($input['password']),
        ])->setRememberToken(Str::random(60));

        $user->save();

        // Fire the PasswordReset event (maintains existing behavior and integrations)
        event(new PasswordReset($user));
    }
}
