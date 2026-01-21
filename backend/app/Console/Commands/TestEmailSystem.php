<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Invitation;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmailSystem extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:email-system';

    /**
     * The console command description.
     */
    protected $description = 'Test the email notification system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Testing Email System...');

        // Test basic mail configuration
        $this->info('📧 Mail driver: '.config('mail.default'));

        // Test waitlist confirmation
        $waitlistEntry = WaitlistEntry::first();
        if ($waitlistEntry) {
            $this->info("✉️  Testing waitlist confirmation for: {$waitlistEntry->email}");

            try {
                Mail::send('emails.waitlist-confirmation', [
                    'waitlistEntry' => $waitlistEntry,
                ], function ($message) use ($waitlistEntry): void {
                    $message->to($waitlistEntry->email)
                        ->subject('You\'re on the waitlist for '.config('app.name').'!');
                });

                $this->info('✅ Waitlist confirmation email sent successfully!');
            } catch (\Exception $e) {
                $this->error('❌ Waitlist email failed: '.$e->getMessage());
            }
        }

        // Test invitation email
        $invitation = Invitation::first();
        $inviter = User::first();

        if ($invitation && $inviter) {
            $this->info('📨 Testing invitation email...');

            try {
                Mail::send('emails.invitation', [
                    'inviter' => $inviter,
                    'invitation' => $invitation,
                    'invitationUrl' => $invitation->getInvitationUrl(),
                ], function ($message): void {
                    $message->to('test-invite@example.com')
                        ->subject('You\'re invited to join '.config('app.name').'!');
                });

                $this->info('✅ Invitation email sent successfully!');
            } catch (\Exception $e) {
                $this->error('❌ Invitation email failed: '.$e->getMessage());
            }
        }

        $this->info('🎉 Email system testing completed!');
        $this->info('📝 Check storage/logs/laravel.log for email content (using log driver)');
    }
}
