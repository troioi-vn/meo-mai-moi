<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Lab404\Impersonate\Services\ImpersonateManager;

class ImpersonationController extends Controller
{
    public function status(Request $request)
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return response()->json([
                'is_impersonating' => false,
                'impersonator' => null,
                'impersonated_user' => null,
            ]);
        }

        $impersonatorId = session()->get('impersonate.impersonator_id');
        /** @var \App\Models\User|null $impersonator */
        $impersonator = \App\Models\User::find($impersonatorId);
        $currentUser = $request->user();

        return response()->json([
            'is_impersonating' => true,
            'impersonator' => $impersonator instanceof \App\Models\User ? [
                'id' => $impersonator->id,
                'name' => $impersonator->name,
                'can_access_admin' => $impersonator->hasRole(['admin', 'super_admin']),
            ] : null,
            'impersonated_user' => $currentUser instanceof \App\Models\User ? [
                'id' => $currentUser->id,
                'name' => $currentUser->name,
            ] : null,
        ]);
    }

    public function leave(Request $request)
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return response()->json(['message' => 'Not impersonating'], 400);
        }

        $manager->leave();

        return response()->json(['message' => 'Impersonation ended']);
    }
}
