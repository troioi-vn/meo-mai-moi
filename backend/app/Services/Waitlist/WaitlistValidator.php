<?php

namespace App\Services\Waitlist;

use App\Models\User;
use App\Models\WaitlistEntry;

class WaitlistValidator
{
    /**
     * Validate email for waitlist (comprehensive check).
     */
    public function validateEmailForWaitlist(string $email): array
    {
        $errors = [];

        if (!$this->isValidEmailFormat($email)) {
            $errors[] = 'Invalid email format';
        }

        if ($this->isEmailRegistered($email)) {
            $errors[] = 'Email is already registered';
        }

        if ($this->isEmailOnWaitlist($email)) {
            $errors[] = 'Email is already on waitlist';
        }

        return $errors;
    }

    private function isValidEmailFormat(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function isEmailRegistered(string $email): bool
    {
        return User::where('email', $email)->exists();
    }

    private function isEmailOnWaitlist(string $email): bool
    {
        return WaitlistEntry::isEmailOnWaitlist($email);
    }
}