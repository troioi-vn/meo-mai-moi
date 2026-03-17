<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Custom Validation Messages
    |--------------------------------------------------------------------------
    |
    | These are custom validation messages used across the application.
    | Laravel's built-in validation messages are in the framework.
    |
    */

    'custom' => [
        'email' => [
            'required' => 'Email is required.',
            'email' => 'Please enter a valid email address.',
            'unique' => 'This email is already registered.',
            'exists' => 'We could not find an account with this email.',
        ],

        'password' => [
            'required' => 'Password is required.',
            'min' => 'Password must be at least :min characters.',
            'confirmed' => 'Password confirmation does not match.',
            'current_password' => 'The current password is incorrect.',
        ],

        'current_password' => [
            'required' => 'Please enter your password to confirm account deletion.',
        ],

        'name' => [
            'required' => 'Name is required.',
            'min' => 'Name must be at least :min characters.',
            'max' => 'Name cannot exceed :max characters.',
        ],

        'phone_number' => [
            'regex' => 'Phone number contains invalid characters.',
        ],
    ],

    'password_messages' => [
        'required' => 'Password is required.',
        'min' => 'Password must be at least :min characters.',
        'confirmed' => 'Password confirmation does not match.',
        'current_incorrect' => 'The current password is incorrect.',
        'required_for_deletion' => 'Please enter your password to confirm account deletion.',
        'no_password_set' => 'This account has no password set. Please use the password reset option to set one.',
    ],
];
