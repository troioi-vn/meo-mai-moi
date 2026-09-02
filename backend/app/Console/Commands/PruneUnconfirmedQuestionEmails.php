<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Placement\PlacementQuestionService;
use Illuminate\Console\Command;

class PruneUnconfirmedQuestionEmails extends Command
{
    protected $signature = 'placement-questions:prune-unconfirmed';

    protected $description = 'Delete asker email addresses that were never confirmed inside their window';

    public function handle(PlacementQuestionService $service): int
    {
        $count = $service->discardUnconfirmedEmails();

        $this->info("Discarded {$count} unconfirmed asker email address(es).");

        return self::SUCCESS;
    }
}
