<?php

declare(strict_types=1);

return [
    'idempotency_ttl_seconds' => (int) env('OFFLINE_IDEMPOTENCY_TTL_SECONDS', 86_400),
    'idempotency_key_prefix' => env('OFFLINE_IDEMPOTENCY_KEY_PREFIX', 'offline-idempotency'),
    'idempotency_key_max_length' => (int) env('OFFLINE_IDEMPOTENCY_KEY_MAX_LENGTH', 128),
];
