<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Exceptions\FinanceException;
use App\Models\Ledger;
use App\Models\LedgerTransactionHealthLink;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\User;
use App\Models\VaccinationRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class HealthFinanceService
{
    public function __construct(private readonly LedgerPetService $pets, private readonly LedgerTransactionService $transactions) {}

    /** @param array<string, mixed> $expense */
    public function attachExpense(Model $record, Pet $pet, User $actor, array $expense, string $occurredOn, string $description): void
    {
        $ledger = Ledger::query()->find($expense['ledger_id']);
        if ($ledger === null || ! $actor->can('manage', $ledger)) {
            throw new FinanceException(__('messages.forbidden'), 403);
        }
        if (! $this->pets->isAvailable($ledger, $pet->id)) {
            $this->pets->addManual($ledger, $pet, $actor);
        }
        $transaction = $this->transactions->create($ledger, $actor, [
            'type' => 'expense', 'amount' => $expense['amount'], 'account_id' => $expense['account_id'],
            'category_id' => $expense['category_id'] ?? null, 'occurred_on' => $occurredOn,
            'description' => $expense['description'] ?? $description, 'pet_ids' => [$pet->id],
        ]);
        $column = match (true) {
            $record instanceof MedicalRecord => 'medical_record_id',
            $record instanceof VaccinationRecord => 'vaccination_record_id',
            $record instanceof PetMicrochip => 'pet_microchip_id',
            default => throw new FinanceException('Unsupported health record.'),
        };
        LedgerTransactionHealthLink::query()->create(['ledger_transaction_id' => $transaction->id, $column => $record->getKey()]);
    }

    public function deleteRecord(Model $record, User $actor, ?string $choice): void
    {
        $column = match (true) {
            $record instanceof MedicalRecord => 'medical_record_id',
            $record instanceof VaccinationRecord => 'vaccination_record_id',
            $record instanceof PetMicrochip => 'pet_microchip_id',
            default => throw new FinanceException('Unsupported health record.'),
        };
        $link = LedgerTransactionHealthLink::query()->where($column, $record->getKey())->first();
        if ($link !== null && ! in_array($choice, ['keep', 'delete'], true)) {
            throw new FinanceException(__('finance.errors.health_delete_choice'));
        }
        $transaction = $link?->transaction;
        if ($link !== null && ($transaction === null || ! $actor->can('manage', $transaction->ledger))) {
            throw new FinanceException(__('messages.forbidden'), 403);
        }

        DB::transaction(function () use ($record, $link, $transaction, $choice): void {
            if ($link !== null) {
                $link->delete();
                if ($choice === 'delete' && $transaction !== null) {
                    $transaction->delete();
                }
            }
            $record->delete();
        });
    }
}
