<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EmailConfigurationStatus;
use App\Models\EmailConfiguration;
use App\Models\EmailLog;
use App\Models\User;
use App\Notifications\CustomPasswordReset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordResetEmailLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_log_body_does_not_contain_the_reset_token(): void
    {
        EmailConfiguration::factory()->create(['status' => EmailConfigurationStatus::ACTIVE]);
        $user = User::factory()->create();
        $token = 'reset-token-that-must-not-be-stored';

        $mail = (new CustomPasswordReset($token))->toMail($user);

        $this->assertStringContainsString($token, $mail->getResetUrl());

        $log = EmailLog::where('user_id', $user->id)->sole();
        $this->assertStringNotContainsString($token, $log->body);
        $this->assertStringContainsString('/reset-password/…', $log->body);
    }
}
