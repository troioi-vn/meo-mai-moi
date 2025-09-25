<?php

namespace App\Console\Commands;

use App\Models\Pet;
use App\Models\OwnershipHistory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillOwnershipHistory extends Command
{
    protected $signature = 'ownership-history:backfill {--dry-run : Show what would change without writing} {--chunk=500 : Process pets in chunks}';

    protected $description = 'Create initial open ownership_history records for existing pets that lack them.';

    public function handle(): int
    {
        if (!Schema::hasTable('ownership_history')) {
            $this->error('Table ownership_history does not exist. Run migrations first.');
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $chunk = (int) $this->option('chunk');

        $created = 0;
        $this->info('Scanning pets for missing initial ownership history...');

        Pet::query()->orderBy('id')->chunk($chunk, function ($pets) use (&$created, $dryRun) {
            foreach ($pets as $pet) {
                $exists = OwnershipHistory::where('pet_id', $pet->id)
                    ->where('user_id', $pet->user_id)
                    ->whereNull('to_ts')
                    ->exists();
                if (!$exists) {
                    $from = $pet->created_at ?? now();
                    if ($dryRun) {
                        $this->line("Would create ownership_history for pet {$pet->id} owner {$pet->user_id} from {$from}");
                    } else {
                        OwnershipHistory::create([
                            'pet_id' => $pet->id,
                            'user_id' => $pet->user_id,
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
