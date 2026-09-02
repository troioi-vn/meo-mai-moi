<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-domain handoff
    |--------------------------------------------------------------------------
    |
    | The Filament panel and the public app sit on different registrable
    | domains, so no session cookie can span them. Impersonation instead mints
    | a single-use token in the shared cache and the public app trades it for a
    | session of its own.
    |
    | Keep the window short. It only has to survive one redirect.
    |
    */

    'handoff_token_ttl_seconds' => (int) env('IMPERSONATION_HANDOFF_TTL_SECONDS', 60),

    // Where the public app sends the operator once impersonation starts.
    'landing_path' => env('IMPERSONATION_LANDING_PATH', '/'),
];
