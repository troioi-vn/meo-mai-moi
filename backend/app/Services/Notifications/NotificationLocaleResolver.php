<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use Illuminate\Http\Request;

class NotificationLocaleResolver
{
    public function resolve(?\App\Models\User $user = null, ?Request $request = null): string
    {
        // 1) Explicit user profile locale
        $candidate = $user->locale ?? null;

        // 2) Accept-Language header
        if (! $candidate && $request) {
            $locale = $request->getPreferredLanguage($this->supportedLocales());
            if ($locale) {
                $candidate = substr($locale, 0, 2);
            }
        }

        // 3) App default
        if (! $candidate) {
            $candidate = config('app.locale', config('notification_templates.default_locale', 'en'));
        }

        // Normalize
        $candidate = substr((string) $candidate, 0, 5);

        return $candidate ? $candidate : 'en';
    }

    public function fallbackChain(string $primary): array
    {
        $defaults = [config('notification_templates.default_locale', 'en'), 'en'];

        return array_values(array_unique(array_filter([$primary, ...$defaults])));
    }

    private function supportedLocales(): array
    {
        // For now defer to locales.supported if present, else at least the default
        $supported = config('locales.supported');
        if (is_array($supported) && $supported) {
            return $supported;
        }

        return [config('notification_templates.default_locale', 'en')];
    }
}
