<?php

use App\Enums\NotificationType;

return [
    // Default locale for templates
    'default_locale' => 'en',

    // Supported channels and defaults
    'channels' => [
        'email' => [
            'engine' => 'blade',
        ],
        'in_app' => [
            'engine' => 'markdown',
        ],
    ],

    // Per-notification type registry
    'types' => [
        // Owner receives: when someone responds to their placement request
        NotificationType::PLACEMENT_REQUEST_RESPONSE->value => [
            'slug' => 'placement-request-response',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'user', 'type' => 'App\\Models\\User', 'required' => true],
                ['name' => 'pet', 'type' => 'App\\Models\\Pet', 'required' => false],
                ['name' => 'helperProfile', 'type' => 'App\\Models\\HelperProfile', 'required' => false],
                ['name' => 'placementRequest', 'type' => 'App\\Models\\PlacementRequest', 'required' => false],
                ['name' => 'actionUrl', 'type' => 'string', 'required' => true],
                ['name' => 'unsubscribeUrl', 'type' => 'string', 'required' => true],
            ],
        ],

        // Helper receives: when owner accepts their response
        NotificationType::HELPER_RESPONSE_ACCEPTED->value => [
            'slug' => 'helper-response-accepted',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'pet_id', 'type' => 'integer', 'required' => true],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],

        // Helper receives: when owner rejects their response
        NotificationType::HELPER_RESPONSE_REJECTED->value => [
            'slug' => 'helper-response-rejected',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'pet_id', 'type' => 'integer', 'required' => true],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],

        // Owner receives: when helper cancels their response
        NotificationType::HELPER_RESPONSE_CANCELED->value => [
            'slug' => 'helper-response-canceled',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'helper_name', 'type' => 'string', 'required' => false],
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'pet_id', 'type' => 'integer', 'required' => true],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],

        // Owner receives: when helper confirms physical handover
        NotificationType::TRANSFER_CONFIRMED->value => [
            'slug' => 'transfer-confirmed',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'pet_id', 'type' => 'integer', 'required' => true],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],

        // Helper receives: when placement ends (pet returned)
        NotificationType::PLACEMENT_ENDED->value => [
            'slug' => 'placement-ended',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'pet_id', 'type' => 'integer', 'required' => true],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],

        // Pet reminders
        NotificationType::VACCINATION_REMINDER->value => [
            'slug' => 'vaccination-reminder',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'vaccination_name', 'type' => 'string', 'required' => true],
                ['name' => 'due_date', 'type' => 'string', 'required' => true],
            ],
        ],

        NotificationType::PET_BIRTHDAY->value => [
            'slug' => 'pet-birthday',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'pet_name', 'type' => 'string', 'required' => true],
                ['name' => 'age', 'type' => 'integer', 'required' => false],
            ],
        ],

        // Account
        NotificationType::EMAIL_VERIFICATION->value => [
            'slug' => 'email-verification',
            'channels' => ['email'],
            'variables' => [
                ['name' => 'user', 'type' => 'App\\Models\\User', 'required' => true],
                ['name' => 'verificationUrl', 'type' => 'string', 'required' => true],
                ['name' => 'appName', 'type' => 'string', 'required' => true],
            ],
        ],

        // Messaging
        NotificationType::NEW_MESSAGE->value => [
            'slug' => 'new-message',
            'channels' => ['email', 'in_app'],
            'variables' => [
                ['name' => 'sender_name', 'type' => 'string', 'required' => true],
                ['name' => 'message_preview', 'type' => 'string', 'required' => false],
                ['name' => 'link', 'type' => 'string', 'required' => true],
            ],
        ],
    ],
];
