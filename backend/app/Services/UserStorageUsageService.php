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
        $petIds = $this->petIdsForUser($user);
        $totalBytes = $this->mediaBytesOwnedDirectlyByUser($user)
            + $this->mediaBytesAttachedToPets($petIds)
            + $this->helperProfilePhotoBytes($user)
            + $this->chatImageBytes($user);

        return max(0, $totalBytes);
    }

    private function mediaBytesOwnedDirectlyByUser(User $user): int
    {
        return $this->sumMediaSizesForModel(User::class, [$user->id]);
    }

    /**
     * @param  list<int>  $petIds
     */
    private function mediaBytesAttachedToPets(array $petIds): int
    {
        if ($petIds === []) {
            return 0;
        }

        return $this->sumMediaSizesForModel(Pet::class, $petIds)
            + $this->sumMediaSizesForModel(MedicalRecord::class, $this->medicalRecordIdsForPets($petIds))
            + $this->sumMediaSizesForModel(VaccinationRecord::class, $this->vaccinationRecordIdsForPets($petIds));
    }

    /**
     * @param  class-string  $modelType
     * @param  list<int>  $modelIds
     */
    private function sumMediaSizesForModel(string $modelType, array $modelIds): int
    {
        if ($modelIds === []) {
            return 0;
        }

        return (int) Media::query()
            ->where('model_type', $modelType)
            ->whereIn('model_id', $modelIds)
            ->sum('size');
    }

    /**
     * @return list<int>
     */
    private function petIdsForUser(User $user): array
    {
        return DB::table('pets')
            ->where('created_by', $user->id)
            ->pluck('id')
            ->all();
    }

    /**
     * @param  list<int>  $petIds
     *
     * @return list<int>
     */
    private function medicalRecordIdsForPets(array $petIds): array
    {
        return DB::table('medical_records')
            ->whereIn('pet_id', $petIds)
            ->pluck('id')
            ->all();
    }

    /**
     * @param  list<int>  $petIds
     *
     * @return list<int>
     */
    private function vaccinationRecordIdsForPets(array $petIds): array
    {
        return DB::table('vaccination_records')
            ->whereIn('pet_id', $petIds)
            ->pluck('id')
            ->all();
    }

    private function helperProfilePhotoBytes(User $user): int
    {
        $paths = DB::table('helper_profile_photos')
            ->join('helper_profiles', 'helper_profile_photos.helper_profile_id', '=', 'helper_profiles.id')
            ->where('helper_profiles.user_id', $user->id)
            ->pluck('helper_profile_photos.path');

        return $this->sumExistingPublicFiles($paths->all());
    }

    private function chatImageBytes(User $user): int
    {
        $paths = [];

        foreach (
            DB::table('chat_messages')
                ->where('sender_id', $user->id)
                ->where('type', 'image')
                ->pluck('content') as $url
        ) {
            $path = $this->extractPublicDiskPath($url);

            if ($path !== null) {
                $paths[] = $path;
            }
        }

        return $this->sumExistingPublicFiles($paths);
    }

    /**
     * @param  list<mixed>  $paths
     */
    private function sumExistingPublicFiles(array $paths): int
    {
        $totalBytes = 0;

        foreach ($paths as $path) {
            if (! is_string($path)) {
                continue;
            }

            $totalBytes += $this->publicFileSize($path);
        }

        return $totalBytes;
    }

    private function publicFileSize(string $path): int
    {
        try {
            if (! Storage::disk('public')->exists($path)) {
                return 0;
            }

            return (int) Storage::disk('public')->size($path);
        } catch (Throwable $exception) {
            report($exception);

            return 0;
        }
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
