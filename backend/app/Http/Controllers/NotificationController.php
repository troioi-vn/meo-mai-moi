<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    use ApiResponseTrait;

    public function index()
    {
        $notifications = Notification::where('user_id', Auth::id())->latest()->get();
        return $this->sendSuccess($notifications);
    }

    public function markAsRead()
    {
        Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return $this->sendSuccess(null, 204);
    }
}