<?php

declare(strict_types=1);

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\InvitationService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Jetstream\Jetstream;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    private SettingsService $settingsService;

    private InvitationService $invitationService;

    public function __construct(SettingsService $settingsService, InvitationService $invitationService)
    {
        $this->settingsService = $settingsService;
        $this->invitationService = $invitationService;
    }

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        // Check if invite-only mode is enabled
        $isInviteOnlyEnabled = $this->settingsService->isInviteOnlyEnabled();

        // Base validation rules
        $validationRules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => $this->passwordRules(),
            'terms' => Jetstream::hasTermsAndPrivacyPolicyFeature() ? ['accepted', 'required'] : '',
        ];

        // Add invitation code validation if invite-only mode is enabled
        if ($isInviteOnlyEnabled) {
            $validationRules['invitation_code'] = ['required', 'string'];
        }

        Validator::make($input, $validationRules)->validate();

        // Validate invitation code if provided (required when invite-only is enabled)
        $invitation = null;
        if (isset($input['invitation_code'])) {
            $invitation = $this->invitationService->validateInvitationCode($input['invitation_code']);

            // If invite-only mode is enabled, invitation code must be valid
            if ($isInviteOnlyEnabled && ! $invitation) {
                throw ValidationException::withMessages([
                    'invitation_code' => ['The provided invitation code is invalid or has expired.'],
                ]);
            }
        }

        // Check if email verification is required
        $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();

        /** @var User $user */
        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => Hash::make($input['password']),
            'email_verified_at' => $emailVerificationRequired ? null : now(), // Auto-verify if not required
        ]);
        // User created; if email verification is not required, it's marked verified immediately

        // If we used an invitation code, mark it as accepted (regardless of invite-only mode)
        if (isset($invitation)) {
            $this->invitationService->acceptInvitation($input['invitation_code'], $user);
        }

        // NOTE: Do not send the email verification here.
        // RegisterResponse handles sending the verification email and
        // provides appropriate feedback to the client. Sending here as well
        // can cause duplicate emails.

        // Session login handled by Fortify; do not force login here

        return $user;
    }
}
