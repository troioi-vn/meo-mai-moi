<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\LedgerTransactionType;
use App\Exceptions\FinanceException;
use App\Models\Ledger;
use App\Models\LedgerAccount;
use App\Models\LedgerCategory;
use App\Models\LedgerTransaction;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LedgerTransactionService
{
    public function __construct(private readonly LedgerPetService $pets) {}

    /** @param array<string, mixed> $filters @return LengthAwarePaginator<LedgerTransaction> */
    public function paginate(Ledger $ledger, array $filters): LengthAwarePaginator
    {
        return LedgerTransaction::query()->where('ledger_id', $ledger->id)
            ->with(['account', 'category', 'creator', 'petLinks.pet'])
            ->when($filters['date_from'] ?? null, fn (Builder $q, $v) => $q->whereDate('occurred_on', '>=', $v))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $v) => $q->whereDate('occurred_on', '<=', $v))
            ->when($filters['type'] ?? null, fn (Builder $q, $v) => $q->where('type', $v))
            ->when($filters['account_id'] ?? null, fn (Builder $q, $v) => $q->where('account_id', $v))
            ->when($filters['category_id'] ?? null, fn (Builder $q, $v) => $q->where('category_id', $v))
            ->when($filters['creator_id'] ?? null, fn (Builder $q, $v) => $q->where('created_by_user_id', $v))
            ->when($filters['pet_id'] ?? null, fn (Builder $q, $v) => $q->whereHas('petLinks', fn (Builder $link) => $link->where('pet_id', $v)))
            ->when($filters['search'] ?? null, fn (Builder $q, $v) => $q->where('description', 'ilike', '%'.str_replace(['%', '_'], ['\\%', '\\_'], $v).'%'))
            ->orderByDesc('occurred_on')->orderByDesc('id')
            ->paginate(min(100, max(1, (int) ($filters['per_page'] ?? 20))));
    }

    /** @param array<string, mixed> $data */
    public function create(Ledger $ledger, User $actor, array $data): LedgerTransaction
    {
        return DB::transaction(function () use ($ledger, $actor, $data): LedgerTransaction {
            $lockedLedger = Ledger::query()->whereKey($ledger->id)->lockForUpdate()->firstOrFail();
            $validated = $this->validateReferences($lockedLedger, $data);
            $transaction = LedgerTransaction::query()->create($validated + [
                'ledger_id' => $lockedLedger->id, 'created_by_user_id' => $actor->id,
            ]);
            $this->syncPetLinks($lockedLedger, $transaction, $data['pet_ids'] ?? []);

            return $transaction->fresh(['account', 'category', 'creator', 'petLinks.pet']) ?? $transaction;
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Ledger $ledger, LedgerTransaction $transaction, User $actor, array $data): LedgerTransaction
    {
        if ($transaction->ledger_id !== $ledger->id) {
            throw new FinanceException(__('finance.errors.not_found'), 404);
        }

        return DB::transaction(function () use ($ledger, $transaction, $actor, $data): LedgerTransaction {
            $merged = array_merge([
                'account_id' => $transaction->account_id, 'category_id' => $transaction->category_id,
                'type' => $transaction->type->value, 'amount' => Money::fromMinor($transaction->amount_minor, $ledger->currency->minor_units)->toMajor(),
                'occurred_on' => $transaction->occurred_on->toDateString(), 'description' => $transaction->description,
            ], $data);
            $transaction->update($this->validateReferences($ledger, $merged) + ['updated_by_user_id' => $actor->id]);
            if (array_key_exists('pet_ids', $data)) {
                $this->syncPetLinks($ledger, $transaction, $data['pet_ids']);
            }

            return $transaction->fresh(['account', 'category', 'creator', 'petLinks.pet']) ?? $transaction;
        });
    }

    /** @param array<string, mixed> $data @return array<string, mixed> */
    private function validateReferences(Ledger $ledger, array $data): array
    {
        $ledger->loadMissing('currency');
        $account = LedgerAccount::query()->where('ledger_id', $ledger->id)->whereKey($data['account_id'])->first();
        if ($account === null || $account->archived_at !== null) {
            throw new FinanceException(__('finance.errors.account_invalid'));
        }
        $type = LedgerTransactionType::from((string) $data['type']);
        $categoryId = $data['category_id'] ?? null;
        if ($categoryId !== null) {
            $category = LedgerCategory::query()->where('ledger_id', $ledger->id)->whereKey($categoryId)->first();
            if ($category === null || $category->archived_at !== null || ! $category->applies_to->accepts($type)) {
                throw new FinanceException(__('finance.errors.category_invalid'));
            }
        }
        try {
            $amount = Money::fromMajor((string) $data['amount'], $ledger->currency->minor_units);
        } catch (InvalidArgumentException $e) {
            throw new FinanceException($e->getMessage());
        }

        return [
            'account_id' => $account->id, 'category_id' => $categoryId, 'type' => $type,
            'amount_minor' => $amount->minor, 'occurred_on' => $data['occurred_on'],
            'description' => isset($data['description']) && trim((string) $data['description']) !== '' ? trim((string) $data['description']) : null,
        ];
    }

    /** @param list<int> $petIds */
    private function syncPetLinks(Ledger $ledger, LedgerTransaction $transaction, array $petIds): void
    {
        $petIds = array_values(array_unique(array_map('intval', $petIds)));
        foreach ($petIds as $petId) {
            if (! $this->pets->isAvailable($ledger, $petId)) {
                throw new FinanceException(__('finance.errors.pet_unavailable'));
            }
        }
        $transaction->petLinks()->delete();
        if ($petIds === []) {
            return;
        }
        $pets = Pet::query()->whereKey($petIds)->get()->keyBy('id');
        foreach ($petIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet === null) {
                throw new FinanceException(__('finance.errors.pet_unavailable'));
            }
            $transaction->petLinks()->create(['pet_id' => $pet->id, 'pet_name_snapshot' => $pet->name]);
        }
    }

    /** @return array<string, mixed> */
    public function serialize(LedgerTransaction $transaction): array
    {
        $transaction->loadMissing(['ledger.currency', 'account', 'category', 'creator', 'petLinks.pet', 'media']);

        return [
            'id' => $transaction->id, 'ledger_id' => $transaction->ledger_id,
            'account_id' => $transaction->account_id, 'account_name' => $transaction->account?->name,
            'category_id' => $transaction->category_id, 'category_name' => $transaction->category?->name,
            'type' => $transaction->type->value, 'amount_minor' => $transaction->amount_minor,
            'amount' => Money::fromMinor($transaction->amount_minor, $transaction->ledger->currency->minor_units)->toMajor(),
            'occurred_on' => $transaction->occurred_on->toDateString(), 'description' => $transaction->description,
            'created_by' => ['id' => $transaction->created_by_user_id, 'name' => $transaction->creator?->name],
            'pets' => $this->serializePets($transaction),
            'has_receipt' => $transaction->getFirstMedia('receipt') !== null,
            'created_at' => $transaction->created_at, 'updated_at' => $transaction->updated_at,
        ];
    }

    /** @return list<array{id: int|null, name: string, name_snapshot: string}> */
    private function serializePets(LedgerTransaction $transaction): array
    {
        $pets = [];
        foreach ($transaction->petLinks as $link) {
            $pets[] = ['id' => $link->pet_id, 'name' => $link->pet !== null ? $link->pet->name : $link->pet_name_snapshot, 'name_snapshot' => $link->pet_name_snapshot];
        }

        return $pets;
    }
}
