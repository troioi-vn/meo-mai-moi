<?php

declare(strict_types=1);

return [
    'user_email' => env('DEMO_USER_EMAIL', 'demo@catarchy.space'),
    'user_name' => env('DEMO_USER_NAME', 'Demo Caregiver'),
    'user_password' => env('DEMO_USER_PASSWORD', 'password'),
    'token_ttl_seconds' => (int) env('DEMO_LOGIN_TOKEN_TTL_SECONDS', 120),
    'redirect_path' => env('DEMO_LOGIN_REDIRECT_PATH', '/'),

    /*
    |--------------------------------------------------------------------------
    | Demo reseed guards
    |--------------------------------------------------------------------------
    |
    | `demo:reseed` drops every table. These are the configuration-layer guards
    | described in docs/e2e-ci.md. Each one must pass, and each fails closed:
    | an absent or unparseable value is treated as "not allowed".
    |
    | The data-layer guard is the sentinel below, and it is the only one that
    | survives a completely wrong environment. See the command itself.
    |
    */

    'reseed_allowed' => filter_var(env('DEMO_RESEED_ALLOWED', false), FILTER_VALIDATE_BOOLEAN),

    'reseed_allowed_urls' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'DEMO_RESEED_ALLOWED_URLS',
            'https://dev.meo-mai-moi.com,https://localhost,http://localhost:8000'
        ))
    ))),

    'sentinel_key' => 'demo_environment',
];
