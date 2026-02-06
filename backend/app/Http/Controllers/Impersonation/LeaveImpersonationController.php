<?php

declare(strict_types=1);

namespace App\Http\Controllers\Impersonation;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Lab404\Impersonate\Services\ImpersonateManager;
use OpenApi\Attributes as OA;

class LeaveImpersonationController extends Controller
{
    use ApiResponseTrait;

    #[OA\Post(
        path: '/api/impersonation/leave',
        summary: 'Stop impersonating a user',
        tags: ['Impersonation'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Impersonation ended',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiSuccessMessageResponse')
            ),
            new OA\Response(
                response: 400,
                description: 'Not impersonating',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorMessageResponse')
            ),
        ]
    )]
    public function __invoke(Request $request)
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return $this->sendError(__('messages.impersonation.not_impersonating'), 400);
        }

        $manager->leave();

        return $this->sendSuccessWithMeta([], 'Impersonation ended');
    }
}
