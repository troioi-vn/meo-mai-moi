<?php

if (! function_exists('frontend_url')) {
    /**
     * Get the frontend application URL.
     */
    function frontend_url(): string
    {
        return config('app.frontend_url');
    }
}
