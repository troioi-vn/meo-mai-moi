<?php

declare(strict_types=1);

use App\Models\HelperProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('helper_profile_photos')) {
            return;
        }

        DB::table('helper_profile_photos')
            ->orderBy('id')
            ->chunkById(100, function ($photos): void {
                foreach ($photos as $photo) {
                    $helperProfile = HelperProfile::find($photo->helper_profile_id);

                    if (! $helperProfile) {
                        continue;
                    }

                    $alreadyMigrated = DB::table('media')
                        ->where('model_type', HelperProfile::class)
                        ->where('model_id', $helperProfile->id)
                        ->where('collection_name', 'photos')
                        ->where('file_name', basename($photo->path))
                        ->exists();

                    if ($alreadyMigrated) {
                        continue;
                    }

                    $helperProfile
                        ->addMediaFromDisk($photo->path, 'public')
                        ->preservingOriginal()
                        ->toMediaCollection('photos');
                }
            });
    }

    public function down(): void
    {
        DB::table('media')
            ->where('model_type', HelperProfile::class)
            ->where('collection_name', 'photos')
            ->delete();
    }
};
