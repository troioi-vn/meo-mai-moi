<?php

return [
    // Time window (in seconds) within which duplicate email verification notifications are suppressed
    'email_verification_idempotency_seconds' => env('EMAIL_VERIFICATION_IDEMPOTENCY_SECONDS', 30),
];
