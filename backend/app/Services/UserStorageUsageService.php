<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccinationRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class UserStorageUsageService
{
    public function calculatePhotoStorageUsedBytes(User $user): int
    {
        $totalBytes = (int) Media::query()
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->sum('size');

        $petIds = DB::table('pets')
            ->where('created_by', $user->id)
            ->pluck('id')
            ->all();

        if ($petIds !== []) {
            $totalBytes += (int) Media::query()
                ->where('model_type', Pet::class)
                ->whereIn('model_id', $petIds)
                ->sum('size');

            $medicalRecordIds = DB::table('medical_records')
                ->whereIn('pet_id', $petIds)
                ->pluck('id')
                ->all();

            if ($medicalRecordIds !== []) {
                $totalBytes += (int) Media::query()
                    ->where('model_type', MedicalRecord::class)
                    ->whereIn('model_id', $medicalRecordIds)
                    ->sum('size');
            }

            $vaccinationRecordIds = DB::table('vaccination_records')
                ->whereIn('pet_id', $petIds)
                ->pluck('id')
                ->all();

            if ($vaccinationRecordIds !== []) {
                $totalBytes += (int) Media::query()
                    ->where('model_type', VaccinationRecord::class)
                    ->whereIn('model_id', $vaccinationRecordIds)
                    ->sum('size');
            }
        }

        $helperPhotoPaths = DB::table('helper_profile_photos')
            ->join('helper_profiles', 'helper_profile_photos.helper_profile_id', '=', 'helper_profiles.id')
            ->where('helper_profiles.user_id', $user->id)
            ->pluck('helper_profile_photos.path');

        foreach ($helperPhotoPaths as $path) {
            try {
                if (is_string($path) && Storage::disk('public')->exists($path)) {
                    $totalBytes += (int) Storage::disk('public')->size($path);
                }
            } catch (Throwable) {
                // Ignore individual file read errors and continue summing.
            }
        }

        $chatImageUrls = DB::table('chat_messages')
            ->where('sender_id', $user->id)
            ->where('type', 'image')
            ->pluck('content');

        foreach ($chatImageUrls as $url) {
            $path = $this->extractPublicDiskPath($url);

            if ($path === null) {
                continue;
            }

            try {
                if (Storage::disk('public')->exists($path)) {
                    $totalBytes += (int) Storage::disk('public')->size($path);
                }
            } catch (Throwable) {
                // Ignore individual file read errors and continue summing.
            }
        }

        return max(0, $totalBytes);
    }

    private function extractPublicDiskPath(mixed $url): ?string
    {
        if (! is_string($url) || $url === '') {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (! str_starts_with($path, '/storage/')) {
            return null;
        }

        return ltrim(substr($path, strlen('/storage/')), '/');
    }
}
