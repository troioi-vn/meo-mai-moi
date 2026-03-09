<?php

declare(strict_types=1);

return [
    'user_email' => env('DEMO_USER_EMAIL', 'demo@catarchy.space'),
    'user_name' => env('DEMO_USER_NAME', 'Demo Caregiver'),
    'user_password' => env('DEMO_USER_PASSWORD', 'password'),
    'token_ttl_seconds' => (int) env('DEMO_LOGIN_TOKEN_TTL_SECONDS', 120),
    'redirect_path' => env('DEMO_LOGIN_REDIRECT_PATH', '/'),
];
