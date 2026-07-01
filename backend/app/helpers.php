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

if (! function_exists('serves_web_app')) {
    /**
     * Whether this container should serve the public React SPA from web routes.
     */
    function serves_web_app(): bool
    {
        if (config('app.disable_admin_panel') === true) {
            return true;
        }

        if (config('app.admin_panel_only') === true) {
            return false;
        }

        $adminDomain = config('app.admin_domain');

        return ! (is_string($adminDomain) && $adminDomain !== '' && ! str_contains($adminDomain, ':'));
    }
}

if (! function_exists('admin_url')) {
    /**
     * Build an absolute URL to the Filament admin panel.
     */
    function admin_url(string $path = ''): string
    {
        $base = config('app.admin_url');

        if (! is_string($base) || $base === '') {
            $base = url('/admin');
        } else {
            $base = rtrim($base, '/');
        }

        if ($path === '') {
            return $base;
        }

        return $base.'/'.ltrim($path, '/');
    }
}
