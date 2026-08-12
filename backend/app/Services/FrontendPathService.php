<?php

declare(strict_types=1);

namespace App\Services;

class FrontendPathService
{
    public function sanitize(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (! str_starts_with($path, '/') || str_starts_with($path, '//') || preg_match('#^https?://#i', $path)) {
            return null;
        }

        return $path;
    }
}
