<?php

namespace App\Http\Controllers;

use App\Models\HelperProfile;
use App\Events\HelperProfileStatusUpdated;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function approveHelperProfile(HelperProfile $helperProfile)
    {
        $helperProfile->update(['approval_status' => 'approved']);

        event(new HelperProfileStatusUpdated($helperProfile));

        return response()->json($helperProfile);
    }

    public function rejectHelperProfile(HelperProfile $helperProfile)
    {
        $helperProfile->update(['approval_status' => 'rejected']);

        event(new HelperProfileStatusUpdated($helperProfile));

        return response()->json($helperProfile);
    }
}