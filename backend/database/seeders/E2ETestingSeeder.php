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
            PetTypeSeeder::class,
            RolesAndPermissionsSeeder::class,  // Must run before UserSeeder
            UserSeeder::class,
        ]);

        // Configure email for E2E testing (MailHog)
        $this->call(E2EEmailConfigurationSeeder::class);

        // Add notification preferences and templates
        $this->call([
            NotificationPreferenceSeeder::class,
            NotificationTemplateSeeder::class,
        ]);

        $this->command->info('✅ E2E testing environment setup complete!');
        $this->command->info('');
        $this->command->info('🔗 Access points:');
        $this->command->info('   - App: http://localhost:8000');
        $this->command->info('   - Admin: http://localhost:8000/admin');
        $this->command->info('   - MailHog: http://localhost:8025');
        $this->command->info('');
        $this->command->info('👤 Test users:');
        $this->command->info('   - Admin: admin@catarchy.space / password');
        $this->command->info('   - User: user1@catarchy.space / password');
    }
}
