<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleMiddleware
{
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
        // Priority 0: When impersonating, keep the impersonator's locale.
        // Without this, the locale would switch to the impersonated user's locale.
        if ($request->hasSession()) {
            $impersonatorId = $request->session()->get('impersonate.impersonator_id');
            if (is_int($impersonatorId) || (is_string($impersonatorId) && ctype_digit($impersonatorId))) {
                $impersonator = User::find((int) $impersonatorId);
                $impersonatorLocale = $impersonator?->locale;
                if (is_string($impersonatorLocale) && $impersonatorLocale !== '' && $this->isSupported($impersonatorLocale)) {
                    return $impersonatorLocale;
                }

                // If we are impersonating but the impersonator has no supported locale
                // preference saved, do not fall back to the impersonated user's locale.
                // Continue with Accept-Language and default resolution.
                if ($impersonatorId !== null) {
                    $headerLocale = $this->parseAcceptLanguage($request->header('Accept-Language', ''));
                    if ($headerLocale) {
                        return $headerLocale;
                    }

                    return config('app.locale', 'en');
                }
            }
        }

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
        /** @var array<string> $supported */
        $supported = config('locales.supported', ['en']);

        return in_array($locale, $supported, true);
    }
}
