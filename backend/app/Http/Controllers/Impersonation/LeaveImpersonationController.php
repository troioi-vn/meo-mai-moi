<?php

declare(strict_types=1);

namespace App\Http\Controllers\Impersonation;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Lab404\Impersonate\Services\ImpersonateManager;

class LeaveImpersonationController extends Controller
{
    public function __invoke(Request $request)
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return response()->json(['message' => 'Not impersonating'], 400);
        }

        $manager->leave();

        return response()->json(['message' => 'Impersonation ended']);
    }
}
