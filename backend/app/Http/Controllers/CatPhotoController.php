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

        $path = $this->fileUploadService->uploadCatPhoto($request->file('photo'), $cat);

        $cat->photos()->create([
            'path' => $path,
            'created_by' => Auth::id(),
        ]);

        return response()->json(['message' => 'Photo uploaded successfully', 'path' => $path]);
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