<?php

namespace App\Services\Waitlist;

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
     */
    public function processBulkInvitations(array $emails, User $inviter, callable $inviteCallback): array
    {
        $results = [];

        DB::transaction(function () use ($emails, $inviter, $inviteCallback, &$results) {
            foreach ($emails as $email) {
                $results[] = $this->processInvitation($email, $inviter, $inviteCallback);
            }
        });

        return $results;
    }

    private function processInvitation(string $email, User $inviter, callable $inviteCallback): array
    {
        try {
            $invitation = $inviteCallback($email, $inviter);
            return $this->buildSuccessResult($email, $invitation);
        } catch (\Exception $e) {
            return $this->buildErrorResult($email, $e);
        }
    }

    private function buildSuccessResult(string $email, $invitation): array
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

    private function buildErrorResult(string $email, \Exception $e): array
    {
        return [
            'email' => $email,
            'success' => false,
            'error' => $e->getMessage(),
        ];
    }
}
