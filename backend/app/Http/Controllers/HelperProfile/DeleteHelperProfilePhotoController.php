<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Support\Facades\Storage;

class DeleteHelperProfilePhotoController extends Controller
{
    public function __invoke(HelperProfile $helperProfile, $photo)
    {
        $this->authorize('update', $helperProfile);

        /** @var \App\Models\HelperProfilePhoto $photoModel */
        $photoModel = $helperProfile->photos()->findOrFail($photo);

        // Delete the photo file from storage
        Storage::disk('public')->delete($photoModel->path);

        // Delete the photo record from the database
        $photoModel->delete();

        return response()->json(null, 204);
    }
}
