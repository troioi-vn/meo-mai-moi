<?php

declare(strict_types=1);

if (! function_exists('frontend_url')) {
    /**
     * Get the frontend application URL.
     */
    function frontend_url(): string
    {
        return rtrim(config('app.frontend_url'), '/');
    }
}
