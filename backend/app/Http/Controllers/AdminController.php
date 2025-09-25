<?php

namespace App\Http\Controllers;

use App\Events\HelperProfileStatusUpdated;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;

class AdminController extends Controller
{
    use ApiResponseTrait;

    public function approveHelperProfile(HelperProfile $helperProfile)
    {
        $helperProfile->update(['approval_status' => 'approved']);

        event(new HelperProfileStatusUpdated($helperProfile));

        return $this->sendSuccess($helperProfile);
    }

    public function rejectHelperProfile(HelperProfile $helperProfile)
    {
        $helperProfile->update(['approval_status' => 'rejected']);

        event(new HelperProfileStatusUpdated($helperProfile));

        return $this->sendSuccess($helperProfile);
    }
}
