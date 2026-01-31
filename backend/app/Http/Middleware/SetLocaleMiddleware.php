<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleMiddleware
{
    /**
     * Supported locales.
     *
     * @var array<string>
     */
    private const SUPPORTED_LOCALES = ['en', 'ru'];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->determineLocale($request);
        App::setLocale($locale);

        return $next($request);
    }

    /**
     * Determine the locale for the request.
     */
    private function determineLocale(Request $request): string
    {
        // Priority 1: Authenticated user's preference from database
        if (Auth::check()) {
            $userLocale = Auth::user()->locale;
            if ($userLocale && $this->isSupported($userLocale)) {
                return $userLocale;
            }
        }

        // Priority 2: Accept-Language header
        $headerLocale = $this->parseAcceptLanguage($request->header('Accept-Language', ''));
        if ($headerLocale) {
            return $headerLocale;
        }

        // Priority 3: Default fallback
        return config('app.locale', 'en');
    }

    /**
     * Parse the Accept-Language header and return the first supported locale.
     */
    private function parseAcceptLanguage(string $header): ?string
    {
        if (empty($header)) {
            return null;
        }

        // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ru;q=0.8")
        $languages = [];
        foreach (explode(',', $header) as $part) {
            $part = trim($part);
            if (empty($part)) {
                continue;
            }

            // Split by semicolon to get language and quality
            $segments = explode(';', $part);
            $lang = strtolower(trim($segments[0]));

            // Extract quality factor (default 1.0)
            $quality = 1.0;
            if (isset($segments[1])) {
                $qPart = trim($segments[1]);
                if (str_starts_with($qPart, 'q=')) {
                    $quality = (float) substr($qPart, 2);
                }
            }

            // Normalize language code (e.g., "en-US" -> "en")
            $lang = explode('-', $lang)[0];

            if ($this->isSupported($lang)) {
                $languages[$lang] = $quality;
            }
        }

        // Sort by quality and return the best match
        if (! empty($languages)) {
            arsort($languages);

            return array_key_first($languages);
        }

        return null;
    }

    /**
     * Check if a locale is supported.
     */
    private function isSupported(string $locale): bool
    {
        return in_array($locale, self::SUPPORTED_LOCALES, true);
    }
}
