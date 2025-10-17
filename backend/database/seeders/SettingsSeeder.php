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
        \App\Models\Settings::updateOrCreate(
            ['key' => 'invite_only_enabled'],
            ['value' => 'true']
        );

        \App\Models\Settings::updateOrCreate(
            ['key' => 'email_verification_required'],
            ['value' => 'true']
        );
    }
}
