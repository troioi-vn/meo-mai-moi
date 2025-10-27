<?php

namespace App\Services\Notifications;

use App\Models\NotificationTemplate;
use Illuminate\Support\Facades\Log;

class NotificationTemplateResolver
{
    public function __construct(
        private NotificationLocaleResolver $localeResolver = new NotificationLocaleResolver
    ) {}

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
        $defaultLocale = config('notification_templates.default_locale', 'en');
        $entry = $registry[$type] ?? null;
        if (! $entry) {
            return null;
        }

        $slug = $entry['slug'];

        if ($channel === 'email') {
            // Expect Blade views in emails/notifications/{locale}/{slug}.blade.php
            $view = "emails.notifications.{$locale}.{$slug}";
            // Backward-compat: also accept legacy path without locale folder for default locale
            $legacyView = "emails.notifications.{$slug}";

            if (view()->exists($view)) {
                $subject = null; // Subject typically provided by mailable; can add subject files later if needed
                $body = " @include('{$view}')"; // body will be rendered via Blade::render when html required

                return [
                    'source' => 'file',
                    'subject' => $subject,
                    'body' => $body,
                    'engine' => 'blade',
                    'locale' => $locale,
                    'version' => null,
                    'view' => $view,
                ];
            }

            if ($locale === $defaultLocale && view()->exists($legacyView)) {
                $subject = null;
                $body = " @include('{$legacyView}')";

                return [
                    'source' => 'file',
                    'subject' => $subject,
                    'body' => $body,
                    'engine' => 'blade',
                    'locale' => $locale,
                    'version' => null,
                    'view' => $legacyView,
                ];
            }

            return null;
        }

        if ($channel === 'in_app') {
            // Expect Markdown file under resources/templates/notifications/bell/{locale}/{slug}.md
            $path = resource_path("templates/notifications/bell/{$locale}/{$slug}.md");
            if (is_file($path)) {
                $body = file_get_contents($path) ?: '';

                return [
                    'source' => 'file',
                    'subject' => null,
                    'body' => $body,
                    'engine' => 'markdown',
                    'locale' => $locale,
                    'version' => null,
                ];
            }

            return null;
        }

        return null;
    }

}
