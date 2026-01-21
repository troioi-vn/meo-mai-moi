<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackfillMediaLibrary extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'medialibrary:backfill {--dry-run : Show what would be migrated without actually doing it}';

    /**
     * The console command description.
     */
    protected $description = 'Backfill existing user avatars and pet photos into MediaLibrary';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('DRY RUN MODE - No changes will be made');
        }

        $this->info('Starting MediaLibrary backfill...');

        // Backfill user avatars
        $this->backfillUserAvatars($dryRun);

        // Backfill pet photos
        $this->backfillPetPhotos($dryRun);

        $this->info('MediaLibrary backfill completed!');
    }

    private function backfillUserAvatars(bool $dryRun): void
    {
        $this->info('Backfilling user avatars...');

        $users = User::whereNotNull('avatar_url')->get();
        $this->info("Found {$users->count()} users with avatars");

        $migrated = 0;
        $skipped = 0;

        foreach ($users as $user) {
            // Skip if already has media
            if ($user->getMedia('avatar')->count() > 0) {
                $skipped++;

                continue;
            }

            // Extract relative path from avatar_url
            $avatarUrl = $user->avatar_url;
            $relativePath = $this->extractRelativePath($avatarUrl);

            if (! $relativePath || ! Storage::disk('public')->exists($relativePath)) {
                $this->warn("File not found for user {$user->id}: {$relativePath}");

                continue;
            }

            if (! $dryRun) {
                try {
                    $fullPath = Storage::disk('public')->path($relativePath);
                    $user->addMedia($fullPath)
                        ->preservingOriginal()
                        ->toMediaCollection('avatar');

                    $migrated++;
                    $this->line("✓ Migrated avatar for user {$user->id}");
                } catch (\Exception $e) {
                    $this->error("Failed to migrate avatar for user {$user->id}: {$e->getMessage()}");
                }
            } else {
                $migrated++;
                $this->line("Would migrate avatar for user {$user->id}: {$relativePath}");
            }
        }

        $this->info("User avatars: {$migrated} migrated, {$skipped} skipped");
    }

    private function backfillPetPhotos(bool $dryRun): void
    {
        $this->info('Backfilling pet photos...');
        $this->info('Pet photos migration is no longer needed - PetPhoto table has been dropped.');
        $this->info('Pet photos: 0 migrated, 0 skipped');
    }

    private function extractRelativePath(string $url): string
    {
        // Handle both full URLs and relative paths
        if (str_starts_with($url, 'http')) {
            $path = parse_url($url, PHP_URL_PATH);

            return str_replace('/storage/', '', $path);
        }

        return str_replace('/storage/', '', $url);
    }
}
