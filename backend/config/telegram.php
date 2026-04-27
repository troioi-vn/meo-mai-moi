<?php

return [
    'user_bot' => [
        'token' => env('TELEGRAM_USER_BOT_TOKEN'),
        'username' => env('TELEGRAM_USER_BOT_USERNAME'),
        'webhook_secret_token' => env('TELEGRAM_USER_BOT_WEBHOOK_SECRET_TOKEN'),
    ],
];
