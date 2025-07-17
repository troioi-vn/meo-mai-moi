<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Services\FileUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CatPhotoController extends Controller
{
    protected $fileUploadService;

    public function __construct(FileUploadService $fileUploadService)
    {
        $this->fileUploadService = $fileUploadService;
    }

    public function store(Request $request, Cat $cat)
    {
        $this->authorize('update', $cat);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $file = $request->file('photo');
        $size = $file->getSize();
        $mimeType = $file->getMimeType();
        $path = $this->fileUploadService->uploadCatPhoto($file, $cat);
        $filename = basename($path);

        $photo = $cat->photos()->create([
            'path' => $path,
            'cat_id' => $cat->id,
            'filename' => $filename,
            'size' => $size,
            'mime_type' => $mimeType,
            'created_by' => Auth::id(),
        ]);

        // Refresh cat with new photo relationship
        $cat->load('photo', 'photos');
        return response()->json([
            'message' => 'Photo uploaded successfully',
            'path' => $path,
            'cat' => $cat,
        ]);
    }

    public function destroy(Cat $cat)
    {
        $this->authorize('update', $cat);

        if ($cat->photo) {
            $this->fileUploadService->delete($cat->photo->path);
            $cat->photo->delete();
        }

        return response()->json(['message' => 'Photo deleted successfully']);
    }
}