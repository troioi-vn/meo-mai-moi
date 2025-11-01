<?php

if (! function_exists('frontend_url')) {
    /**
     * Get the frontend application URL.
     */
    function frontend_url(): string
    {
        $url = config('app.frontend_url');
        if (empty($url)) {
            $envUrl = env('FRONTEND_URL');
            $url = empty($envUrl) ? 'http://localhost:5173' : $envUrl;
        }

        return rtrim($url, '/');
    }
}
