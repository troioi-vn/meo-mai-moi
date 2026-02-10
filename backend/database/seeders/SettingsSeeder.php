<?php

namespace Database\Seeders;

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
        \App\Models\Settings::firstOrCreate(
            ['key' => 'invite_only_enabled'],
            ['value' => 'true']
        );

        \App\Models\Settings::firstOrCreate(
            ['key' => 'email_verification_required'],
            ['value' => 'true']
        );
    }
}
