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
        'current_incorrect' => 'The current password is incorrect.',
        'required_for_deletion' => 'Please enter your password to confirm account deletion.',
        'no_password_set' => 'This account has no password set. Please use the password reset option to set one.',
    ],

    'name' => [
        'required' => 'Name is required.',
        'min' => 'Name must be at least :min characters.',
        'max' => 'Name cannot exceed :max characters.',
    ],

    'pet' => [
        'name_required' => 'Pet name is required.',
        'species_required' => 'Species is required.',
        'species_invalid' => 'Invalid species selected.',
        'birth_date_invalid' => 'Invalid birth date.',
        'birth_date_future' => 'Birth date cannot be in the future.',
        'weight_invalid' => 'Weight must be a positive number.',
    ],

    'medical' => [
        'record_type_required' => 'Record type is required.',
        'record_type_invalid' => 'Invalid record type.',
        'title_required' => 'Title is required.',
        'date_required' => 'Date is required.',
        'date_future' => 'Date cannot be in the future.',
    ],

    'helper' => [
        'bio_required' => 'Bio is required.',
        'bio_max' => 'Bio cannot exceed :max characters.',
        'country_required' => 'Country is required.',
        'cities_required' => 'At least one city is required.',
        'cities_invalid' => 'One or more selected cities are invalid.',
    ],

    'invitation' => [
        'email_required' => 'Recipient email is required.',
        'relationship_type_required' => 'Relationship type is required.',
        'relationship_type_invalid' => 'Invalid relationship type.',
    ],

    'locale' => [
        'invalid' => 'Selected language is not supported.',
    ],

    'notification' => [
        'type_required' => 'The notification type is required.',
        'type_invalid' => 'The selected notification type is invalid.',
        'email_enabled_required' => 'The email enabled preference is required.',
        'email_enabled_boolean' => 'The email enabled preference must be true or false.',
        'in_app_enabled_required' => 'The in-app enabled preference is required.',
        'in_app_enabled_boolean' => 'The in-app enabled preference must be true or false.',
    ],

    'file' => [
        'required' => 'Please select a file.',
        'image' => 'File must be an image.',
        'max' => 'File size cannot exceed :max kilobytes.',
        'mimes' => 'File must be of type: :values.',
    ],
];
