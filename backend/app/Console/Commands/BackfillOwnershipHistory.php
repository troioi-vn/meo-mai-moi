<?php

namespace App\Console\Commands;

use App\Models\Cat;
use App\Models\OwnershipHistory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillOwnershipHistory extends Command
{
    protected $signature = 'ownership-history:backfill {--dry-run : Show what would change without writing} {--chunk=500 : Process cats in chunks}';

    protected $description = 'Create initial open ownership_history records for existing cats that lack them.';

    public function handle(): int
    {
        if (!Schema::hasTable('ownership_history')) {
            $this->error('Table ownership_history does not exist. Run migrations first.');
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $chunk = (int) $this->option('chunk');

        $created = 0;
        $this->info('Scanning cats for missing initial ownership history...');

        Cat::query()->orderBy('id')->chunk($chunk, function ($cats) use (&$created, $dryRun) {
            foreach ($cats as $cat) {
                $exists = OwnershipHistory::where('cat_id', $cat->id)
                    ->where('user_id', $cat->user_id)
                    ->whereNull('to_ts')
                    ->exists();
                if (!$exists) {
                    $from = $cat->created_at ?? now();
                    if ($dryRun) {
                        $this->line("Would create ownership_history for cat {$cat->id} owner {$cat->user_id} from {$from}");
                    } else {
                        OwnershipHistory::create([
                            'cat_id' => $cat->id,
                            'user_id' => $cat->user_id,
                            'from_ts' => $from,
                            'to_ts' => null,
                        ]);
                        $created++;
                    }
                }
            }
        });

        $this->info($dryRun ? 'Dry run complete.' : "Created {$created} ownership_history records.");
        return self::SUCCESS;
    }
}
