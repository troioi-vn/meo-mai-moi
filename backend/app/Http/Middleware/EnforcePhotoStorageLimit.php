<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\SettingsService;
use App\Services\UserStorageUsageService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

class EnforcePhotoStorageLimit
{
    public function __construct(
        private readonly UserStorageUsageService $storageUsageService,
        private readonly SettingsService $settingsService
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user || $request->allFiles() === []) {
            return $next($request);
        }

        $incomingImageBytes = $this->sumIncomingImageBytes($request->allFiles());
        if ($incomingImageBytes <= 0) {
            return $next($request);
        }

        $usedBytes = $this->storageUsageService->calculatePhotoStorageUsedBytes($user);
        $limitBytes = $this->settingsService->getStorageLimitBytesForUser($user);

        if ($usedBytes + $incomingImageBytes <= $limitBytes) {
            return $next($request);
        }

        $message = __('messages.storage.limit_exceeded');

        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => $message,
            'error_code' => 'STORAGE_LIMIT_EXCEEDED',
            'meta' => [
                'used_bytes' => $usedBytes,
                'limit_bytes' => $limitBytes,
                'incoming_bytes' => $incomingImageBytes,
                'upgrade_available' => ! $user->hasRole('premium'),
            ],
        ], 413);
    }

    /**
     * @param  array<string, mixed>  $files
     */
    private function sumIncomingImageBytes(array $files): int
    {
        $bytes = 0;

        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                if ($this->isImageFile($file)) {
                    $bytes += max(0, (int) $file->getSize());
                }

                continue;
            }

            if (is_array($file)) {
                $bytes += $this->sumIncomingImageBytes($file);
            }
        }

        return $bytes;
    }

    private function isImageFile(UploadedFile $file): bool
    {
        $mimeType = $file->getMimeType();

        return is_string($mimeType) && str_starts_with($mimeType, 'image/');
    }
}
