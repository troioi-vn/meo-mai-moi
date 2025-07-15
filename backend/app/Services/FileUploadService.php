<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class FileUploadService
{
    public function uploadUserAvatar(UploadedFile $file, $user): string
    {
        $filename = 'user_' . $user->id . '_' . time() . '.' . $file->extension();
        $path = $file->storeAs('users/avatars', $filename, 'public');

        // Delete old avatar if it exists
        if ($user->avatar_url) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        return $path;
    }

    public function uploadCatPhoto(UploadedFile $file, \App\Models\Cat $cat): string
    {
        $filename = 'cat_' . $cat->id . '_' . time() . '.' . $file->extension();
        $path = $file->storeAs('cats/profiles', $filename, 'public');

        $cat->photos()->create([
            'filename' => $filename,
            'path' => $path,
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return $path;
    }
}
