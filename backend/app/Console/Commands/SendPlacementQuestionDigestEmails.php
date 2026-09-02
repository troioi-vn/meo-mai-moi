<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Enums\PlacementQuestionStatus;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\Placement\PlacementNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

/**
 * The email half of "in-app immediately, email batched".
 *
 * A popular listing can collect a dozen questions in an afternoon, and mailing
 * each one to every volunteer is how a domain gets filtered to spam. The bell
 * already fired the moment each question arrived; this says "you have five
 * waiting" once, to the people accountable for the listing.
 */
class SendPlacementQuestionDigestEmails extends Command
{
    protected $signature = 'placement-questions:send-digest-emails';

    protected $description = 'Email a batched summary of unanswered public questions to the people who can answer them';

    public function handle(NotificationService $notifications, PlacementNotifier $notifier): int
    {
        $pending = PlacementQuestion::query()
            ->where('status', PlacementQuestionStatus::PENDING)
            ->whereNotNull('placement_request_id')
            ->get()
            ->groupBy('placement_request_id');

        if ($pending->isEmpty()) {
            $this->info('No unanswered public questions to digest.');

            return self::SUCCESS;
        }

        $sent = 0;

        foreach ($pending as $placementRequestId => $questions) {
            $placementRequest = PlacementRequest::query()->with('pet')->find($placementRequestId);

            if ($placementRequest === null) {
                continue;
            }

            /** @var Collection<int, User> $recipients */
            $recipients = $notifier->accountableFor($placementRequest);

            foreach ($recipients as $recipient) {
                $notifications->sendEmail($recipient, NotificationType::PLACEMENT_QUESTION_RECEIVED->value, [
                    'message' => trans_choice(
                        'messages.placement_questions.notifications.digest',
                        $questions->count(),
                        [
                            'count' => $questions->count(),
                            'pet' => (string) $placementRequest->pet->name,
                        ],
                    ),
                    'link' => "/requests/{$placementRequest->id}#questions",
                    'placement_request_id' => $placementRequest->id,
                    'pending_count' => $questions->count(),
                ]);

                $sent++;
            }
        }

        $this->info("Sent {$sent} public question digest email(s).");

        return self::SUCCESS;
    }
}
