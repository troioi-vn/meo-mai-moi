<?php

namespace App\Http\Controllers;

use App\Models\HelperProfile;
use App\Events\HelperProfileStatusUpdated;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

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