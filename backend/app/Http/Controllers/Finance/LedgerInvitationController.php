<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class LedgerInvitationController extends Controller
{
    use ApiResponseTrait;

    public function store(Request $request, Ledger $ledger, ResourceInvitationService $service): JsonResponse
    {
        $user = $this->user($request);
        if (! $user->can('update', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $invitation = $service->create(ResourceInvitationType::LEDGER, $user, $ledger);

            return $this->sendSuccess(['invitation' => $service->handlerFor(ResourceInvitationType::LEDGER)->serializeForManager($invitation), 'invitation_url' => $invitation->getInvitationUrl()], 201);
        } catch (RuntimeException) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
    }

    public function index(Request $request, Ledger $ledger, ResourceInvitationService $service): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($service->serializePendingList(ResourceInvitationType::LEDGER, $service->listPendingForTarget(ResourceInvitationType::LEDGER, $ledger)));
    }

    public function destroy(Request $request, Ledger $ledger, ResourceInvitation $invitation, ResourceInvitationService $service): Response|JsonResponse
    {
        if (! $this->user($request)->can('update', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        if (! $service->handlerFor(ResourceInvitationType::LEDGER)->scopeForTarget(ResourceInvitation::query()->whereKey($invitation->id), $ledger)->exists()) {
            return $this->sendError(__('finance.errors.not_found'), 404);
        }
        $service->revoke($invitation);

        return $this->sendNoContent();
    }

    private function user(Request $request): User
    { /** @var User $user */ $user = $request->user();

        return $user;
    }
}
