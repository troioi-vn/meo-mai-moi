<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Group;
use App\Models\Ledger;
use App\Models\Pet;
use App\Models\User;
use App\Services\Finance\LedgerDashboardService;
use App\Services\Finance\LedgerPetService;
use App\Services\Finance\LedgerService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class LedgerController extends Controller
{
    use ApiResponseTrait;

    public function currencies(): JsonResponse
    {
        return $this->sendSuccess(Currency::query()->enabled()->orderBy('code')->get(['code', 'name', 'symbol', 'minor_units']));
    }

    public function index(Request $request, LedgerService $service): JsonResponse
    {
        $user = $this->user($request);

        return $this->sendSuccess($service->list($user, $request->boolean('archived'))->map(fn (Ledger $l) => $service->serialize($l, $user))->values());
    }

    public function store(Request $request, LedgerService $service): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:255'], 'currency_code' => ['required', 'string', 'size:3']]);
        try {
            $user = $this->user($request);

            return $this->sendSuccess($service->serialize($service->create($user, $data['title'], $data['currency_code']), $user, true), 201);
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function show(Request $request, Ledger $ledger, LedgerService $service): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($service->serialize($ledger, $this->user($request), true));
    }

    public function update(Request $request, Ledger $ledger, LedgerService $service): JsonResponse
    {
        if (! $this->user($request)->can('update', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $data = $request->validate(['title' => ['sometimes', 'required', 'string', 'max:255'], 'currency_code' => ['sometimes', 'required', 'string', 'size:3']]);
        try {
            return $this->sendSuccess($service->serialize($service->update($ledger, $data), $this->user($request), true));
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function archive(Request $request, Ledger $ledger, LedgerService $service): JsonResponse
    {
        if (! $this->user($request)->can('archive', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $service->archive($ledger);

        return $this->sendSuccess($service->serialize($ledger->fresh() ?? $ledger, $this->user($request)));
    }

    public function restore(Request $request, Ledger $ledger, LedgerService $service): JsonResponse
    {
        if (! $this->user($request)->can('restore', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $service->restore($ledger);

        return $this->sendSuccess($service->serialize($ledger->fresh() ?? $ledger, $this->user($request)));
    }

    public function destroy(Request $request, Ledger $ledger, LedgerService $service): Response|JsonResponse
    {
        if (! $this->user($request)->can('delete', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $service->deleteUnused($ledger, $this->user($request));

            return $this->sendNoContent();
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function members(Request $request, Ledger $ledger): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $members = [];
        foreach ($ledger->activeMemberships()->with('user')->get() as $membership) {
            $members[] = ['user_id' => $membership->user_id, 'name' => $membership->user?->name, 'start_at' => $membership->start_at];
        }

        return $this->sendSuccess($members);
    }

    public function removeMember(Request $request, Ledger $ledger, User $user, LedgerService $service): Response|JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $service->endMembership($ledger, $user);

            return $this->sendNoContent();
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function leave(Request $request, Ledger $ledger, LedgerService $service): Response|JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger) || $ledger->isArchived()) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $service->endMembership($ledger, $this->user($request));

            return $this->sendNoContent();
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function pets(Request $request, Ledger $ledger): JsonResponse
    {
        $viewer = $this->user($request);
        if (! $viewer->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $assignments = $ledger->activePetAssignments()->with('pet.media')->get()->groupBy('pet_id');
        $allocations = DB::table('ledger_transaction_pets')
            ->join('ledger_transactions', 'ledger_transactions.id', '=', 'ledger_transaction_pets.ledger_transaction_id')
            ->where('ledger_transactions.ledger_id', $ledger->id)
            ->whereNull('ledger_transactions.deleted_at')
            ->select(['ledger_transaction_pets.pet_id', 'ledger_transactions.type', 'ledger_transactions.amount_minor'])
            ->selectRaw('COUNT(*) OVER (PARTITION BY ledger_transactions.id) AS pet_count')
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY ledger_transactions.id ORDER BY ledger_transaction_pets.pet_id) AS pet_position');
        $totals = DB::query()->fromSub($allocations, 'pet_allocations')
            ->whereIn('pet_id', $assignments->keys())
            ->groupBy('pet_id')
            ->selectRaw('pet_id')
            ->selectRaw("COALESCE(SUM((amount_minor / pet_count) + CASE WHEN pet_position <= (amount_minor % pet_count) THEN 1 ELSE 0 END) FILTER (WHERE type = 'income'), 0) AS income_minor")
            ->selectRaw("COALESCE(SUM((amount_minor / pet_count) + CASE WHEN pet_position <= (amount_minor % pet_count) THEN 1 ELSE 0 END) FILTER (WHERE type = 'expense'), 0) AS expense_minor")
            ->get()
            ->keyBy('pet_id');

        return $this->sendSuccess($assignments->map(function ($rows, $petId) use ($viewer, $totals) {
            $pet = $rows->first()?->pet;
            $petTotals = $totals->get($petId);
            $income = (int) data_get($petTotals, 'income_minor', 0);
            $expense = (int) data_get($petTotals, 'expense_minor', 0);

            return ['id' => $pet?->id, 'name' => $pet?->name, 'photo_url' => $pet?->photo_url, 'can_view_profile' => $pet !== null && $viewer->can('view', $pet), 'sources' => $rows->pluck('source')->map(fn ($s) => $s->value)->unique()->values(), 'income_minor' => $income, 'expense_minor' => $expense, 'net_activity_minor' => $income - $expense];
        })->values());
    }

    public function addPet(Request $request, Ledger $ledger, Pet $pet, LedgerPetService $service): JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $service->addManual($ledger, $pet, $this->user($request));

            return $this->sendSuccess(['pet_id' => $pet->id], 201);
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function removePet(Request $request, Ledger $ledger, Pet $pet, LedgerPetService $service): Response|JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            $service->removeManual($ledger, $pet);

            return $this->sendNoContent();
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function linkGroup(Request $request, Ledger $ledger, LedgerPetService $pets): JsonResponse
    {
        $actor = $this->user($request);
        if (! $actor->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $data = $request->validate(['group_id' => ['required', 'integer', 'exists:groups,id'], 'import_pets' => ['sometimes', 'boolean'], 'sync_group_pets' => ['sometimes', 'boolean']]);
        $group = Group::query()->findOrFail($data['group_id']);
        if (! $actor->can('update', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        DB::transaction(function () use ($ledger, $group, $data, $pets): void {
            $syncGroupPets = (bool) ($data['sync_group_pets'] ?? false);
            if ($ledger->group_id !== null && ($ledger->group_id !== $group->id || ! $syncGroupPets)) {
                $ledger->activePetAssignments()->where('source_group_id', $ledger->group_id)->update(['end_at' => now()]);
            }
            $ledger->update(['group_id' => $group->id, 'sync_group_pets' => $syncGroupPets]);
            if (($data['import_pets'] ?? false) || $syncGroupPets) {
                $group->activeGroupPets()->with('pet')->get()->each(fn ($assignment) => $assignment->pet !== null ? $pets->synchronize($ledger, $group, $assignment->pet, true) : null);
            }
        });

        return $this->sendSuccess(['group_id' => $group->id, 'sync_group_pets' => $ledger->sync_group_pets]);
    }

    public function unlinkGroup(Request $request, Ledger $ledger, LedgerPetService $pets): Response|JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $group = $ledger->group;
        if (! $group instanceof Group) {
            $ledger->update(['group_id' => null, 'sync_group_pets' => false]);

            return $this->sendNoContent();
        }
        if ($group !== null) {
            $ledger->activePetAssignments()->where('source_group_id', $group->id)->with('pet')->get()->each(fn ($a) => $a->pet !== null ? $pets->synchronize($ledger, $group, $a->pet, false) : null);
        }
        $ledger->update(['group_id' => null, 'sync_group_pets' => false]);

        return $this->sendNoContent();
    }

    public function dashboard(Request $request, Ledger $ledger, LedgerDashboardService $service): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($service->build($ledger));
    }

    private function user(Request $request): User
    {
        /** @var User $user */ $user = $request->user();

        return $user;
    }
}
