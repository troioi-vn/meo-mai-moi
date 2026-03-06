<?php

declare(strict_types=1);

return [
    'daily_quota' => [
        // Regular users are capped per UTC day; premium users are unlimited.
        'regular' => (int) env('API_DAILY_QUOTA_REGULAR', 1000),
    ],

    'request_logs' => [
        'retention_days' => (int) env('API_REQUEST_LOG_RETENTION_DAYS', 30),
    ],
];
