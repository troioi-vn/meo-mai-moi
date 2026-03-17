<?php

namespace Database\Seeders;

use App\Models\Settings;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Use firstOrCreate to set defaults without overriding admin changes.
        // updateOrCreate was resetting invite_only_enabled to 'true' on every
        // seeder run, silently re-enabling invite-only mode.
        Settings::firstOrCreate(
            ['key' => 'invite_only_enabled'],
            ['value' => 'true']
        );

        Settings::firstOrCreate(
            ['key' => 'email_verification_required'],
            ['value' => 'true']
        );

        Settings::firstOrCreate(
            ['key' => 'storage_limit_default_mb'],
            ['value' => '50']
        );

        Settings::firstOrCreate(
            ['key' => 'storage_limit_premium_mb'],
            ['value' => '5120']
        );
    }
}
