<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ApiRequestLog;
use App\Services\SettingsService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class PruneApiRequestLogsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'api-logs:prune';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune old API request logs based on configured retention days';

    public function handle(SettingsService $settingsService): int
    {
        $retentionDays = $settingsService->getApiRequestLogsRetentionDays();
        $cutoff = Carbon::now()->subDays($retentionDays);

        $deleted = ApiRequestLog::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Pruned {$deleted} API request log entries older than {$retentionDays} days.");

        return self::SUCCESS;
    }
}
