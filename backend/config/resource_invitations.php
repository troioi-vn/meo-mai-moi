<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Default invitation TTLs by resource type
    |--------------------------------------------------------------------------
    |
    | Durations are Carbon interval strings understood by now()->add(...).
    |
    */

    'ttl' => [
        'pet' => '1 hour',
        'group' => '7 days',
        'ledger' => '7 days',
    ],

];
