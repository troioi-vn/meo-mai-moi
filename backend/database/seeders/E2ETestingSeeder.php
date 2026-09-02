<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class E2ETestingSeeder extends Seeder
{
    /**
     * Run the database seeds for E2E testing environment.
     *
     * This seeder orchestrates all necessary seeders for a complete
     * E2E testing environment with proper email configuration.
     */
    public function run(): void
    {
        $this->command->info('🚀 Setting up E2E testing environment...');

        // Run essential seeders for basic functionality
        $this->call([
            CitySeeder::class,
            CurrencySeeder::class,
            PetTypeSeeder::class,
            CategorySeeder::class,
            RolesAndPermissionsSeeder::class,  // Must run before UserSeeder
            UserSeeder::class,
            HelperProfileSeeder::class,
            DemoPetsSeeder::class,
            DemoPlacementSeeder::class,
            DemoLedgerSeeder::class,
        ]);

        // Which mailer gets activated depends on which stack is being seeded.
        // The demo and the suite stand in separate databases now, so they no
        // longer have to agree: the demo sends through Mailgun for real
        // delivery, the suite sends to MailHog so it can assert on messages.
        // An unrecognised or missing profile falls back to MailHog, because a
        // container that is unsure of itself must not emit real mail.
        $this->call(match ((string) config('demo.mailer_profile')) {
            'mailgun' => DemoEmailConfigurationSeeder::class,
            default => E2EEmailConfigurationSeeder::class,
        });

        // Add notification preferences and templates
        $this->call([
            NotificationPreferenceSeeder::class,
            NotificationTemplateSeeder::class,
        ]);

        $this->command->info('✅ E2E testing environment setup complete!');
        $this->command->info('');
        $this->command->info('🔗 Access points:');
        $this->command->info('   - App: http://localhost:8000');
        $this->command->info('   - Admin: http://localhost:8001');
        if ((string) config('demo.mailer_profile') !== 'mailgun') {
            $this->command->info('   - MailHog: http://localhost:8025');
        }
        $this->command->info('');
        $this->command->info('👤 Test users:');
        $this->command->info('   - Admin: admin@catarchy.space / password');
        $this->command->info('   - User: user1@catarchy.space / password');
        $this->command->info('   - Password reset: password-reset@catarchy.space / password');
        $this->command->info('   - Invitee: invitee@catarchy.space / password');
        $this->command->info('   - Telegram placeholder: telegram_5612904335@telegram.meo-mai-moi.local / password');
    }
}
