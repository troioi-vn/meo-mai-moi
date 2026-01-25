<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Users;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class BanUserController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, User $user)
    {
        // Prevent banning admins/super_admins via API.
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return $this->sendError('Cannot ban an admin user.', 422);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $user->forceFill([
            'is_banned' => true,
            'banned_at' => now(),
            'ban_reason' => $validated['reason'] ?? null,
        ])->save();

        return $this->sendSuccess([
            'id' => $user->id,
            'is_banned' => (bool) $user->is_banned,
            'banned_at' => $user->banned_at,
            'ban_reason' => $user->ban_reason,
        ]);
    }
}
