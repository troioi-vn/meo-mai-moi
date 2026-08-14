<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ErrorEvent;
use App\Services\SettingsService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class PruneErrorEventsCommand extends Command
{
    protected $signature = 'errors:prune';

    protected $description = 'Prune old runtime error events based on configured retention days';

    public function handle(SettingsService $settingsService): int
    {
        $retentionDays = $settingsService->getErrorEventRetentionDays();
        $cutoff = Carbon::now()->subDays($retentionDays);

        $deleted = ErrorEvent::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Pruned {$deleted} error event entries older than {$retentionDays} days.");

        return self::SUCCESS;
    }
}
