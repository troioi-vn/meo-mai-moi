<?php

namespace App\Http\Controllers\Impersonation;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Lab404\Impersonate\Services\ImpersonateManager;

class GetImpersonationStatusController extends Controller
{
    public function __invoke(Request $request)
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
}
