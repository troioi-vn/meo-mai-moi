<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use App\Models\Cat;
use App\Models\User;

class FileUploadService
{
    protected $imageManager;

    public function __construct(ImageManager $imageManager)
    {
        $this->imageManager = $imageManager;
    }

    public function uploadCatPhoto(UploadedFile $file, Cat $cat): string
    {
        // Delete old photo if it exists
        if ($cat->photo) {
            $this->delete($cat->photo->path);
            $cat->photo->delete();
        }

        $filename = $cat->id . '_' . time() . '.' . $file->extension();
        $image = $this->imageManager->read($file);

        $image->resize(1200, 675);

        $path = 'cats/profiles/' . $filename;
        Storage::disk('public')->put($path, (string) $image->encode());

        return $path;
    }

    public function uploadUserAvatar(UploadedFile $file, User $user): string
    {
        // Delete old avatar if it exists
        if ($user->avatar_url) {
            // Extract path from URL if it's a storage URL
            $oldPath = str_replace('/storage/', '', parse_url($user->avatar_url, PHP_URL_PATH));
            $this->delete($oldPath);
        }

        $filename = 'user_' . $user->id . '_' . time() . '.' . $file->extension();
        $image = $this->imageManager->read($file);

        // Resize avatar to a square format
        $image->resize(400, 400);

        $path = 'users/avatars/' . $filename;
        Storage::disk('public')->put($path, (string) $image->encode());

        return $path;
    }

    public function delete(string $path): void
    {
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}