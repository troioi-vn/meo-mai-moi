<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\ResourceInvitationType;
use App\Exceptions\FinanceException;
use App\Models\Currency;
use App\Models\Ledger;
use App\Models\LedgerAccount;
use App\Models\LedgerCategory;
use App\Models\LedgerMembership;
use App\Models\LedgerPetAssignment;
use App\Models\LedgerTransaction;
use App\Models\User;
use App\Services\ResourceInvitationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class LedgerService
{
    public function __construct(private readonly ResourceInvitationService $invitations) {}

    /** @return Collection<int, Ledger> */
    public function list(User $user, bool $archived = false): Collection
    {
        return Ledger::query()->accessibleBy($user)
            ->when($archived, fn ($q) => $q->whereNotNull('archived_at'), fn ($q) => $q->whereNull('archived_at'))
            ->with('currency')->withCount('activeMemberships')
            ->addSelect(['active_pet_assignments_count' => LedgerPetAssignment::query()
                ->selectRaw('COUNT(DISTINCT pet_id)')
                ->whereColumn('ledger_id', 'ledgers.id')
                ->whereNull('end_at')])
            ->orderBy('title')->orderBy('id')->get();
    }

    public function create(User $creator, string $title, string $currencyCode): Ledger
    {
        $currency = Currency::query()->enabled()->find(strtoupper($currencyCode));
        if ($currency === null) {
            throw new FinanceException(__('finance.errors.currency_unavailable'));
        }

        return DB::transaction(function () use ($creator, $title, $currency): Ledger {
            $ledger = Ledger::query()->create([
                'title' => trim($title), 'currency_code' => $currency->code,
                'created_by_user_id' => $creator->id,
            ]);
            LedgerMembership::query()->create([
                'ledger_id' => $ledger->id, 'user_id' => $creator->id,
                'start_at' => now(),
            ]);
            LedgerAccount::query()->create([
                'ledger_id' => $ledger->id, 'name' => __('finance.starter.cash'),
                'created_by_user_id' => $creator->id,
            ]);
            foreach (__('finance.starter.categories') as $appliesTo => $names) {
                foreach ($names as $name) {
                    LedgerCategory::query()->create([
                        'ledger_id' => $ledger->id, 'name' => $name,
                        'applies_to' => $appliesTo, 'created_by_user_id' => $creator->id,
                    ]);
                }
            }

            return $ledger->fresh(['currency', 'accounts', 'categories', 'activeMemberships.user']) ?? $ledger;
        });
    }

    /** @param array{title?: string, currency_code?: string} $attributes */
    public function update(Ledger $ledger, array $attributes): Ledger
    {
        if (isset($attributes['currency_code'])) {
            $code = strtoupper($attributes['currency_code']);
            if ($code !== $ledger->currency_code) {
                if (LedgerTransaction::withTrashed()->where('ledger_id', $ledger->id)->exists()) {
                    throw new FinanceException(__('finance.errors.currency_locked'));
                }
                if (! Currency::query()->enabled()->whereKey($code)->exists()) {
                    throw new FinanceException(__('finance.errors.currency_unavailable'));
                }
                $attributes['currency_code'] = $code;
            }
        }
        $ledger->update($attributes);

        return $ledger->fresh('currency') ?? $ledger;
    }

    public function archive(Ledger $ledger): void
    {
        DB::transaction(function () use ($ledger): void {
            $ledger->update(['archived_at' => now()]);
            $this->invitations->handlerFor(ResourceInvitationType::LEDGER)->revokePendingForTarget($ledger);
        });
    }

    public function restore(Ledger $ledger): void
    {
        $ledger->update(['archived_at' => null]);
    }

    public function deleteEmpty(Ledger $ledger): void
    {
        if (LedgerTransaction::withTrashed()->where('ledger_id', $ledger->id)->exists()) {
            throw new FinanceException(__('finance.errors.not_empty'));
        }
        DB::transaction(function () use ($ledger): void {
            $this->invitations->handlerFor(ResourceInvitationType::LEDGER)->revokePendingForTarget($ledger);
            $ledger->delete();
        });
    }

    public function endMembership(Ledger $ledger, User $member): void
    {
        DB::transaction(function () use ($ledger, $member): void {
            Ledger::query()->whereKey($ledger->id)->lockForUpdate()->firstOrFail();
            $memberships = LedgerMembership::query()->active()->where('ledger_id', $ledger->id)->lockForUpdate()->get();
            $membership = $memberships->firstWhere('user_id', $member->id);
            if ($membership === null) {
                throw new FinanceException(__('finance.errors.not_member'), 404);
            }
            if ($memberships->count() <= 1) {
                throw new FinanceException(__('finance.errors.last_member'));
            }
            $membership->update(['end_at' => now()]);
        });
    }

    public function addMember(Ledger $ledger, User $member, User $invitedBy): LedgerMembership
    {
        return DB::transaction(function () use ($ledger, $member, $invitedBy): LedgerMembership {
            Ledger::query()->whereKey($ledger->id)->lockForUpdate()->firstOrFail();
            if (LedgerMembership::query()->active()->where('ledger_id', $ledger->id)->where('user_id', $member->id)->exists()) {
                throw new FinanceException(__('finance.errors.already_member'));
            }

            return LedgerMembership::query()->create([
                'ledger_id' => $ledger->id,
                'user_id' => $member->id,
                'invited_by_user_id' => $invitedBy->id,
                'start_at' => now(),
            ]);
        });
    }

    /** @return array<string, mixed> */
    public function serialize(Ledger $ledger, bool $detail = false): array
    {
        $ledger->loadMissing('currency');
        $data = [
            'id' => $ledger->id, 'title' => $ledger->title,
            'currency_code' => $ledger->currency_code,
            'currency' => $ledger->currency === null ? null : [
                'code' => $ledger->currency->code, 'name' => $ledger->currency->name,
                'symbol' => $ledger->currency->symbol, 'minor_units' => $ledger->currency->minor_units,
            ],
            'group_id' => $ledger->group_id, 'sync_group_pets' => $ledger->sync_group_pets,
            'archived_at' => $ledger->archived_at, 'created_by_user_id' => $ledger->created_by_user_id,
            'member_count' => (int) ($ledger->active_memberships_count ?? $ledger->activeMemberships()->count()),
            'pet_count' => (int) ($ledger->active_pet_assignments_count ?? $ledger->activePetAssignments()->distinct('pet_id')->count('pet_id')),
        ];
        if ($detail) {
            $members = [];
            foreach ($ledger->activeMemberships()->with('user')->get() as $membership) {
                /** @var LedgerMembership $membership */
                $members[] = ['user_id' => $membership->user_id, 'name' => $membership->user?->name, 'start_at' => $membership->start_at];
            }
            $data['members'] = $members;
        }

        return $data;
    }
}
