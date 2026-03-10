<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\NotificationTemplate;
use Illuminate\Support\Facades\Log;

class NotificationTemplateResolver
{
    public function __construct(
        private NotificationLocaleResolver $localeResolver = new NotificationLocaleResolver()
    ) {
    }

    /**
     * Resolve a template for type/channel and locale chain.
     * Returns an array: [
     *   'source' => 'db'|'file',
     *   'subject' => string|null,
     *   'body' => string,
     *   'engine' => 'blade'|'markdown'|'text',
     *   'locale' => string,
     *   'version' => int|null
     * ] or null if not found.
     */
    public function resolve(string $type, string $channel, ?string $locale = null): ?array
    {
        $primary = $locale ?? $this->localeResolver->resolve();
        $chain = $this->localeResolver->fallbackChain($primary);

        foreach ($chain as $loc) {
            // Try DB override first
            $db = NotificationTemplate::query()
                ->active()
                ->for($type, $channel, $loc)
                ->first();

            if ($db) {
                return [
                    'source' => 'db',
                    'subject' => $db->subject_template,
                    'body' => $db->body_template,
                    'engine' => $db->engine,
                    'locale' => $db->locale,
                    'version' => $db->version,
                ];
            }

            // Try file default
            $file = $this->loadFileTemplate($type, $channel, $loc);
            if ($file) {
                return $file;
            }
        }

        Log::warning('Notification template not found; using final fallback', [
            'type' => $type,
            'channel' => $channel,
            'attempted_locales' => $chain,
        ]);

        return null;
    }

    private function loadFileTemplate(string $type, string $channel, string $locale): ?array
    {
        $registry = config('notification_templates.types');
        $entry = $registry[$type] ?? null;
        if (! $entry) {
            return null;
        }

        $slug = $entry['slug'];

        return match ($channel) {
            'email' => $this->loadEmailTemplate($slug, $locale),
            'in_app' => $this->loadInAppTemplate($slug, $locale),
            default => null,
        };
    }

    private function loadEmailTemplate(string $slug, string $locale): ?array
    {
        $view = "emails.notifications.{$locale}.{$slug}";

        if (view()->exists($view)) {
            return $this->buildFileResult(" @include('{$view}')", 'blade', $locale, $view);
        }

        // Backward-compat: legacy path without locale folder for default locale
        $defaultLocale = config('notification_templates.default_locale', 'en');
        $legacyView = "emails.notifications.{$slug}";

        if ($locale === $defaultLocale && view()->exists($legacyView)) {
            return $this->buildFileResult(" @include('{$legacyView}')", 'blade', $locale, $legacyView);
        }

        return null;
    }

    private function loadInAppTemplate(string $slug, string $locale): ?array
    {
        $path = resource_path("templates/notifications/bell/{$locale}/{$slug}.md");

        if (! is_file($path)) {
            return null;
        }

        $body = file_get_contents($path) ?: '';

        return $this->buildFileResult($body, 'markdown', $locale);
    }

    private function buildFileResult(string $body, string $engine, string $locale, ?string $view = null): array
    {
        return array_filter([
            'source' => 'file',
            'subject' => null,
            'body' => $body,
            'engine' => $engine,
            'locale' => $locale,
            'version' => null,
            'view' => $view,
        ], fn ($v) => $v !== null);
    }
}
