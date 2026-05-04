<?php

declare(strict_types=1);

namespace App\Services\Waitlist;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BulkInvitationProcessor
{
    public function __construct()
    {
        // No dependencies needed - uses callback pattern
    }

    /**
     * Process bulk invitations from waitlist.
        *
        * @param list<string> $emails
        * @param callable(string, User): ?Invitation $inviteCallback
        * @return list<array{email: string, success: bool, invitation?: Invitation, error?: string}>
     */
    public function processBulkInvitations(array $emails, User $inviter, callable $inviteCallback): array
    {
        $results = [];

        DB::transaction(function () use ($emails, $inviter, $inviteCallback, &$results): void {
            foreach ($emails as $email) {
                $results[] = $this->processInvitation($email, $inviter, $inviteCallback);
            }
        });

        return $results;
    }

    /**
     * @param callable(string, User): ?Invitation $inviteCallback
     * @return array{email: string, success: bool, invitation?: Invitation, error?: string}
     */
    private function processInvitation(string $email, User $inviter, callable $inviteCallback): array
    {
        try {
            $invitation = $inviteCallback($email, $inviter);

            return $this->buildSuccessResult($email, $invitation);
        } catch (\Exception $e) {
            return $this->buildErrorResult($email, $e);
        }
    }

    /**
     * @return array{email: string, success: bool, invitation?: Invitation}
     */
    private function buildSuccessResult(string $email, ?Invitation $invitation): array
    {
        $result = [
            'email' => $email,
            'success' => $invitation !== null,
        ];

        if ($invitation) {
            $result['invitation'] = $invitation;
        }

        return $result;
    }

    /**
     * @return array{email: string, success: false, error: string}
     */
    private function buildErrorResult(string $email, \Exception $e): array
    {
        return [
            'email' => $email,
            'success' => false,
            'error' => $e->getMessage(),
        ];
    }
}
