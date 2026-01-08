<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
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
        Log::info('DEBUG: ResetUserPassword::reset called', [
            'user_id' => $user->id,
            'email' => $user->email,
            'had_password' => $user->password !== null,
        ]);

        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        // Use Hash::make explicitly to ensure password is hashed correctly
        // (CompletePasswordReset will handle remember token and PasswordReset event)
        $hashedPassword = Hash::make($input['password']);
        
        Log::info('DEBUG: ResetUserPassword saving', [
            'user_id' => $user->id,
            'new_hash_prefix' => substr($hashedPassword, 0, 10) . '...',
        ]);

        $user->forceFill([
            'password' => $hashedPassword,
        ])->save();

        // Verify the save worked
        $user->refresh();
        Log::info('DEBUG: ResetUserPassword saved', [
            'user_id' => $user->id,
            'password_set' => $user->password !== null,
            'saved_hash_prefix' => $user->password ? substr($user->password, 0, 10) . '...' : null,
            'verify_check' => Hash::check($input['password'], $user->password),
        ]);
    }
}
