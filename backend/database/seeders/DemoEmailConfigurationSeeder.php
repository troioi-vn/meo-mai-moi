<?php

namespace Database\Seeders;

use App\Enums\EmailConfigurationStatus;
use App\Models\EmailConfiguration;
use Illuminate\Database\Seeder;

/**
 * Activates Mailgun as the demo's email provider.
 *
 * The demo sends real mail so that delivery itself is exercised - DKIM, SPF,
 * the Mailgun API path, how a template renders in a real client - none of
 * which MailHog can tell you. Production runs the same `mailgun` provider, so
 * this is the same code path rather than a lookalike.
 *
 * Credentials come from the environment and are only *copied* into the row.
 * The row is derived state: `demo:reseed` runs `migrate:fresh`, so whatever is
 * in `email_configurations` is gone on every deploy. That is precisely how the
 * Mailgun configuration kept disappearing from dev before this seeder existed -
 * the reseed deactivated everything and activated MailHog, ten times a day.
 */
class DemoEmailConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $domain = (string) config('services.mailgun.domain');
        $apiKey = (string) config('services.mailgun.secret');

        if ($domain === '' || $apiKey === '') {
            $this->command->warn('⚠️  MAILGUN_DOMAIN or MAILGUN_SECRET is empty; leaving the demo with no active mailer.');
            $this->command->warn('   Mail will fail rather than silently going out as somebody else.');

            return;
        }

        EmailConfiguration::query()->update(['status' => EmailConfigurationStatus::INACTIVE]);
        EmailConfiguration::where('name', 'Mailgun Demo')->delete();

        $fromAddress = (string) (config('demo.mail_from_address') ?: 'mail@'.$domain);

        $configuration = EmailConfiguration::create([
            'provider' => 'mailgun',
            'name' => 'Mailgun Demo',
            'description' => 'Mailgun configuration for the public demo, seeded from the environment.',
            'status' => EmailConfigurationStatus::ACTIVE,
            'config' => [
                'domain' => $domain,
                'api_key' => $apiKey,
                'endpoint' => (string) config('services.mailgun.endpoint', 'api.mailgun.net'),
                'webhook_signing_key' => (string) config('services.mailgun.webhook_signing_key'),
                'from_address' => $fromAddress,
                'from_name' => (string) config('app.name'),
                'test_email_address' => (string) config('demo.mail_test_address'),
            ],
        ]);

        $this->command->info('✅ Mailgun email configuration created and activated for the demo');
        $this->command->info("   - Domain: {$domain}");
        $this->command->info("   - From:   {$fromAddress}");

        if (! $configuration->isValid()) {
            $this->command->error('❌ Configuration validation failed:');
            foreach ($configuration->getValidationErrors() as $error) {
                $this->command->error("   - {$error}");
            }
        }
    }
}
