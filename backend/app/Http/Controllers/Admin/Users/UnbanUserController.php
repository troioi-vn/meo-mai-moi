<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Users;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class UnbanUserController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, User $user)
    {
        $user->forceFill([
            'is_banned' => false,
            'banned_at' => null,
            'ban_reason' => null,
        ])->save();

        return $this->sendSuccess([
            'id' => $user->id,
            'is_banned' => (bool) $user->is_banned,
            'banned_at' => $user->banned_at,
            'ban_reason' => $user->ban_reason,
        ]);
    }
}
