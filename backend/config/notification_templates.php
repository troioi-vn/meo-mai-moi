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
        NotificationType::PLACEMENT_REQUEST_ACCEPTED->value => [
            'slug' => 'placement-request-accepted',
            'channels' => ['email', 'in_app'],
            'variables' => [],
        ],
        NotificationType::HELPER_RESPONSE_ACCEPTED->value => [
            'slug' => 'helper-response-accepted',
            'channels' => ['email', 'in_app'],
            'variables' => [],
        ],
        NotificationType::HELPER_RESPONSE_REJECTED->value => [
            'slug' => 'helper-response-rejected',
            'channels' => ['email', 'in_app'],
            'variables' => [],
        ],
        NotificationType::VACCINATION_REMINDER->value => [
            'slug' => 'vaccination-reminder',
            'channels' => ['email', 'in_app'],
            'variables' => [],
        ],
    ],
];
