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

    /*
    |--------------------------------------------------------------------------
    | Expected database
    |--------------------------------------------------------------------------
    |
    | The demo and the e2e suite now stand in separate databases, and both are
    | reseeded, so the APP_URL guard above can no longer tell them apart: both
    | stacks answer to https://dev.meo-mai-moi.com on purpose, because the
    | runner reaches its own stack by pinning that hostname to a different
    | loopback address.
    |
    | This guard names the database each container is allowed to wipe. It fails
    | closed: unset means "refuse". It is the readable half of the protection
    | and it says *why* when it fires; the half that survives a completely wrong
    | environment is the Postgres grant, since the e2e role holds no privileges
    | on the demo database at all.
    |
    */

    'reseed_expected_database' => env('DEMO_RESEED_EXPECTED_DATABASE'),

    /*
    |--------------------------------------------------------------------------
    | Mailer profile
    |--------------------------------------------------------------------------
    |
    | Which email configuration the reseed activates. The demo sends through
    | Mailgun so real delivery is exercised on the same provider production
    | uses; the e2e stack sends to MailHog so the suite can assert on messages.
    |
    | Defaults to mailhog because that is the harmless answer to a missing
    | value. Guessing "mailgun" here would turn a misconfigured container into
    | one that emits real mail from the domain.
    |
    */

    'mailer_profile' => env('DEMO_MAILER_PROFILE', 'mailhog'),

    // Read here rather than in the seeder: the deploy leaves a warm
    // bootstrap/cache/config.php, and env() outside the config directory
    // returns null once the config is cached.
    'mail_from_address' => env('DEMO_MAIL_FROM_ADDRESS'),

    'mail_test_address' => env('DEMO_MAIL_TEST_ADDRESS', 'pavel@catarchy.space'),

    'sentinel_key' => 'demo_environment',
];
