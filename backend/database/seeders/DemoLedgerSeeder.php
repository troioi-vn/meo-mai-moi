<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Ledger;
use App\Models\LedgerAccount;
use App\Models\LedgerMembership;
use App\Models\LedgerPetAssignment;
use App\Models\LedgerTransaction;
use App\Models\Pet;
use App\Models\User;
use App\Services\Finance\LedgerService;
use Illuminate\Database\Seeder;

class DemoLedgerSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', config('demo.user_email'))->first();
        if ($user === null) {
            return;
        }
        $ledger = Ledger::query()->where('created_by_user_id', $user->id)->where('title', 'Catarchy Rescue')->first();
        if ($ledger === null) {
            $ledger = app(LedgerService::class)->create($user, 'Catarchy Rescue', 'VND');
        }
        LedgerMembership::query()->firstOrCreate(['ledger_id' => $ledger->id, 'user_id' => $user->id, 'end_at' => null], ['start_at' => now()]);
        $account = $ledger->accounts()->where('name', 'Cash')->first() ?? $ledger->accounts()->firstOrFail();
        $bank = LedgerAccount::query()->firstOrCreate(
            ['ledger_id' => $ledger->id, 'name' => 'Community bank'],
            ['created_by_user_id' => $user->id]
        );
        $medical = $ledger->categories()->where('name', 'Medical')->first();
        $donations = $ledger->categories()->where('name', 'Donations')->first();
        $pets = Pet::query()->where('created_by', $user->id)->orderBy('id')->limit(3)->get();
        foreach ($pets as $pet) {
            LedgerPetAssignment::query()->firstOrCreate(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => 'manual', 'end_at' => null], ['added_by_user_id' => $user->id, 'start_at' => now()]);
        }
        $transactions = [
            ['type' => 'income', 'amount_minor' => 2500000, 'description' => 'Community donations', 'category_id' => $donations?->id, 'account_id' => $bank->id, 'occurred_on' => now()->startOfMonth()->toDateString()],
            ['type' => 'expense', 'amount_minor' => 780000, 'description' => 'Wellness visit and medicine', 'category_id' => $medical?->id, 'account_id' => $account->id, 'occurred_on' => now()->subDays(3)->toDateString()],
        ];
        foreach ($transactions as $data) {
            LedgerTransaction::query()->updateOrCreate(['ledger_id' => $ledger->id, 'description' => $data['description']], $data + ['created_by_user_id' => $user->id]);
        }
        $expense = LedgerTransaction::query()->where('ledger_id', $ledger->id)->where('description', 'Wellness visit and medicine')->first();
        if ($expense !== null) {
            foreach ($pets->take(2) as $pet) {
                $expense->petLinks()->firstOrCreate(['pet_id' => $pet->id], ['pet_name_snapshot' => $pet->name]);
            }
        }
    }
}
