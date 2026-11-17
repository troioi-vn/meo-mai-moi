<?php

declare(strict_types=1);

namespace App\Filament\Concerns;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;

/**
 * Since Filament 5.11.4 the model policy runs before a canView() override, so
 * the override can only narrow it. These models have membership-based policies
 * that give admins no shortcut, so the admin panel decides view access by role.
 */
trait AuthorizesRecordViewByAdminRole
{
    public static function getViewAuthorizationResponse(Model $record): Response
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasRole(['admin', 'super_admin'])
            ? Response::allow()
            : Response::deny();
    }
}
