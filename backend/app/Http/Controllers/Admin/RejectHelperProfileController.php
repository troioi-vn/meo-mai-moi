<?php

namespace App\Http\Controllers\Admin;

use App\Events\HelperProfileStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;

class RejectHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(HelperProfile $helperProfile)
    {
        $helperProfile->update(['approval_status' => 'rejected']);

        event(new HelperProfileStatusUpdated($helperProfile));

        return $this->sendSuccess($helperProfile);
    }
}
