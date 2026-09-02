<?php

declare(strict_types=1);

namespace App\Http\Controllers\Impersonation;

use App\Http\Controllers\Controller;
use App\Services\Impersonation\ImpersonationHandoffService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Lab404\Impersonate\Services\ImpersonateManager;
use OpenApi\Attributes as OA;

/**
 * Ends an impersonation that arrived over the cross-domain handoff.
 *
 * The package's leave() restores the impersonator into the current session.
 * That was right when the panel and the app shared an origin; here it would
 * mint a live admin session on the *public* domain every time an operator
 * stopped impersonating. So this logs the session out instead and sends the
 * operator back to the panel, where their own session is still waiting.
 */
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
                content: new OA\JsonContent(ref: '#/components/schemas/ImpersonationLeaveResponse')
            ),
            new OA\Response(
                response: 400,
                description: 'Not impersonating',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorMessageResponse')
            ),
        ]
    )]
    public function __invoke(ImpersonationHandoffService $handoff): JsonResponse
    {
        $manager = app(ImpersonateManager::class);

        if (! $manager->isImpersonating()) {
            return $this->sendError(__('messages.impersonation.not_impersonating'), 400);
        }

        // The session helper, not $request->session(): these api routes are not in
        // the session middleware group, so the request has no store bound to it.
        // It is also what the impersonate manager itself reads.
        $session = session();

        // Read both before the logout: it invalidates the session that holds them.
        $backTo = $session->get('impersonate.back_to');
        $auditId = $session->get('impersonate.audit_id');

        Auth::guard('web')->logout();
        $session->invalidate();
        $session->regenerateToken();

        // Sanctum's RequestGuard becomes the default driver on these routes and
        // caches the user it resolved, so logging the web guard out is not enough
        // on its own: auth()->user() would keep answering with the impersonated
        // user for the rest of the request. Drop the resolved guards.
        Auth::forgetGuards();

        $handoff->markLeft(is_numeric($auditId) ? (int) $auditId : null);

        return $this->sendSuccessWithMeta(
            ['back_to' => is_string($backTo) && $backTo !== '' ? $backTo : null],
            'Impersonation ended'
        );
    }
}
