<?php

declare(strict_types=1);

namespace App\Http\Controllers\Impersonation;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Lab404\Impersonate\Services\ImpersonateManager;
use OpenApi\Attributes as OA;

class GetImpersonationStatusController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/impersonation/status',
        summary: 'Get current impersonation status',
        tags: ['Impersonation'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Current impersonation status',
                content: new OA\JsonContent(ref: '#/components/schemas/ImpersonationStatusResponse')
            ),
        ]
    )]
    public function __invoke(Request $request)
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return $this->sendSuccess([
                'is_impersonating' => false,
                'impersonator' => null,
                'impersonated_user' => null,
            ]);
        }

        $impersonatorId = session()->get('impersonate.impersonator_id');
        /** @var \App\Models\User|null $impersonator */
        $impersonator = \App\Models\User::find($impersonatorId);
        $currentUser = $request->user();

        return $this->sendSuccess([
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
