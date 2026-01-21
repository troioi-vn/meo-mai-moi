<?php

declare(strict_types=1);

namespace App\Http\Controllers\Unsubscribe;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Show the unsubscribe page.
 */
class ShowUnsubscribePageController extends Controller
{
    public function __invoke(Request $request): View
    {
        $userId = $request->query('user');
        $notificationType = $request->query('type');
        $token = $request->query('token');

        // Validate parameters
        $isValid = $userId && $notificationType && $token;
        $notificationTypeEnum = null;

        if ($isValid) {
            $notificationTypeEnum = NotificationType::tryFrom($notificationType);
            $isValid = $notificationTypeEnum !== null;
        }

        return view('unsubscribe', [
            'isValid' => $isValid,
            'userId' => $userId,
            'notificationType' => $notificationType,
            'notificationTypeLabel' => $notificationTypeEnum?->getLabel(),
            'token' => $token,
        ]);
    }
}
