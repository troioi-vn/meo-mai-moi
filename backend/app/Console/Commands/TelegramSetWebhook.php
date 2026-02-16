<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\TelegramWebhookService;
use Illuminate\Console\Command;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:set-webhook {--remove : Remove the webhook instead of setting it} {--info : Show current webhook info}';

    protected $description = 'Register (or remove) the Telegram bot webhook with Telegram servers';

    public function handle(TelegramWebhookService $service): int
    {
        if ($this->option('info')) {
            $info = $service->getInfo();

            if (! ($info['ok'] ?? false)) {
                $this->error($info['description'] ?? 'Failed to get webhook info.');

                return 1;
            }

            $result = $info['result'] ?? [];
            $url = $result['url'] ?? '';

            if ($url) {
                $this->info("Webhook URL: {$url}");
                $this->line('Pending updates: '.($result['pending_update_count'] ?? 0));

                if (! empty($result['last_error_message'])) {
                    $this->warn('Last error: '.$result['last_error_message']);
                }
            } else {
                $this->warn('No webhook is currently set.');
            }

            return 0;
        }

        if ($this->option('remove')) {
            $result = $service->remove();

            if ($result['ok']) {
                $this->info('Telegram webhook removed.');

                return 0;
            }

            $this->error("Failed to remove webhook: {$result['description']}");

            return 1;
        }

        $webhookUrl = rtrim((string) config('app.url'), '/').'/api/webhooks/telegram';
        $this->line("Registering webhook: {$webhookUrl}");

        $result = $service->register();

        if ($result['ok']) {
            $this->info('Telegram webhook registered successfully.');

            return 0;
        }

        $this->error("Failed to register webhook: {$result['description']}");

        return 1;
    }
}
