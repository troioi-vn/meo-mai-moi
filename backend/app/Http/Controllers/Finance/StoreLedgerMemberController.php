<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Enums\ResourceInvitationType;
use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\User;
use App\Services\Finance\LedgerService;
use App\Services\SharingSuggestionService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/ledgers/{ledger}/members',
    summary: 'Directly add a suggested user to a ledger',
    tags: ['Finances'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'ledger', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
        required: ['user_id'],
        properties: [new OA\Property(property: 'user_id', type: 'integer')]
    )),
    responses: [
        new OA\Response(response: 201, description: 'Member added', content: new OA\JsonContent(properties: [
            new OA\Property(property: 'success', type: 'boolean'),
            new OA\Property(property: 'data', required: ['user_id', 'name', 'start_at'], properties: [
                new OA\Property(property: 'user_id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'start_at', type: 'string', format: 'date-time'),
            ], type: 'object'),
            new OA\Property(property: 'message', type: 'string', nullable: true),
        ])),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation or domain error'),
    ]
)]
class StoreLedgerMemberController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __invoke(
        Request $request,
        Ledger $ledger,
        LedgerService $ledgers,
        SharingSuggestionService $suggestions,
    ): JsonResponse {
        /** @var User $actor */
        $actor = $request->user();
        if (! $actor->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $ledger)) {
            return $conflict;
        }
        $validated = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);
        /** @var User $target */
        $target = User::query()->findOrFail($validated['user_id']);

        if (! $suggestions->canDirectlyAdd($actor, ResourceInvitationType::LEDGER, $ledger, $target)) {
            return $this->sendError(__('messages.sharing.user_not_suggested'), 422);
        }

        try {
            $membership = $ledgers->addMember($ledger, $target, $actor);
            $ledger->touch();
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }

        return $this->sendSuccess([
            'user_id' => $membership->user_id,
            'name' => $target->name,
            'start_at' => $membership->start_at,
        ], 201);
    }
}
