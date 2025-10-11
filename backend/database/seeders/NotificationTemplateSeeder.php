<?php

namespace Database\Seeders;

use App\Enums\NotificationType;
use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    /**
     * Seed a couple of inactive in-app overrides so the admin list shows entries
     * without changing runtime behavior (file defaults still apply).
     */
    public function run(): void
    {
        // Avoid seeding during automated tests
        if (app()->environment('testing')) {
            return;
        }

        $locale = config('notification_templates.default_locale', 'en');

        // Migrate any previously seeded uppercase type keys to enum values
        $typeMap = [
            'PLACEMENT_REQUEST_RESPONSE' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'HELPER_RESPONSE_ACCEPTED' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
        ];
        foreach ($typeMap as $old => $new) {
            NotificationTemplate::query()->where('type', $old)->update(['type' => $new]);
        }

        $samples = [
            [
                'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                'channel' => 'in_app',
                'locale' => $locale,
                'engine' => 'markdown',
                'subject_template' => null,
                'body_template' => "You have a new response to your placement request.\n\n[Open requests]({{ \$actionUrl ?? '/requests' }})\n\n(Preview override — inactive)",
                'status' => 'inactive',
            ],
            [
                'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
                'channel' => 'in_app',
                'locale' => $locale,
                'engine' => 'markdown',
                'subject_template' => null,
                'body_template' => "Good news! Your helper response was accepted.\n\n[View details]({{ \$actionUrl ?? '/requests' }})\n\n(Preview override — inactive)",
                'status' => 'inactive',
            ],
        ];

        foreach ($samples as $tpl) {
            NotificationTemplate::updateOrCreate(
                [
                    'type' => $tpl['type'],
                    'channel' => $tpl['channel'],
                    'locale' => $tpl['locale'],
                ],
                [
                    'engine' => $tpl['engine'],
                    'subject_template' => $tpl['subject_template'],
                    'body_template' => $tpl['body_template'],
                    'status' => $tpl['status'],
                ]
            );
        }
    }
}
