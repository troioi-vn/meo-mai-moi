<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Models\Ledger;
use App\Models\LedgerTransaction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class LedgerDashboardService
{
    public function __construct(private readonly LedgerTransactionService $transactions) {}

    /** @return array<string, mixed> */
    public function build(Ledger $ledger): array
    {
        $start = CarbonImmutable::now()->startOfMonth();
        $previous = $start->subMonth();
        $totals = LedgerTransaction::query()->where('ledger_id', $ledger->id)
            ->whereBetween('occurred_on', [$previous->toDateString(), $start->endOfMonth()->toDateString()])
            ->selectRaw("COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income' AND occurred_on >= ?), 0) AS income", [$start->toDateString()])
            ->selectRaw("COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense' AND occurred_on >= ?), 0) AS expense", [$start->toDateString()])
            ->selectRaw("COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income' AND occurred_on < ?), 0) AS previous_income", [$start->toDateString()])
            ->selectRaw("COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense' AND occurred_on < ?), 0) AS previous_expense", [$start->toDateString()])->first();
        $byAccount = DB::table('ledger_accounts')
            ->leftJoin('ledger_transactions', function ($join): void {
                $join->on('ledger_transactions.account_id', '=', 'ledger_accounts.id')
                    ->whereNull('ledger_transactions.deleted_at');
            })
            ->where('ledger_accounts.ledger_id', $ledger->id)
            ->groupBy('ledger_accounts.id', 'ledger_accounts.name')
            ->selectRaw('ledger_accounts.id, ledger_accounts.name')
            ->selectRaw("COALESCE(SUM(ledger_transactions.amount_minor) FILTER (WHERE ledger_transactions.type = 'income'), 0) AS income")
            ->selectRaw("COALESCE(SUM(ledger_transactions.amount_minor) FILTER (WHERE ledger_transactions.type = 'expense'), 0) AS expense")->get();
        $income = (int) ($totals->income ?? 0);
        $expense = (int) ($totals->expense ?? 0);
        $accounts = [];
        foreach ($byAccount as $row) {
            $accountIncome = (int) ($row->income ?? 0);
            $accountExpense = (int) ($row->expense ?? 0);
            $accounts[] = ['id' => $row->id, 'name' => $row->name, 'income_minor' => $accountIncome, 'expense_minor' => $accountExpense, 'net_activity_minor' => $accountIncome - $accountExpense];
        }
        $categoryTotals = LedgerTransaction::query()->where('ledger_transactions.ledger_id', $ledger->id)
            ->whereBetween('occurred_on', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->leftJoin('ledger_categories', 'ledger_categories.id', '=', 'ledger_transactions.category_id')
            ->groupBy('ledger_categories.id', 'ledger_categories.name', 'ledger_transactions.type')
            ->selectRaw("ledger_transactions.type, ledger_categories.id, COALESCE(ledger_categories.name, 'Uncategorized') AS name, SUM(amount_minor) AS total")
            ->get();
        $petSpending = DB::table('ledger_transactions')
            ->join('ledger_transaction_pets', 'ledger_transaction_pets.ledger_transaction_id', '=', 'ledger_transactions.id')
            ->where('ledger_transactions.ledger_id', $ledger->id)->where('ledger_transactions.type', 'expense')
            ->whereNull('ledger_transactions.deleted_at')->whereBetween('occurred_on', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->groupBy('ledger_transaction_pets.pet_id', 'ledger_transaction_pets.pet_name_snapshot')
            ->selectRaw('ledger_transaction_pets.pet_id AS id, ledger_transaction_pets.pet_name_snapshot AS name, SUM(amount_minor) AS total')->get();
        $monthlyRows = LedgerTransaction::query()->where('ledger_id', $ledger->id)
            ->where('occurred_on', '>=', $start->subMonths(5)->toDateString())
            ->groupByRaw("date_trunc('month', occurred_on), type")
            ->selectRaw("to_char(date_trunc('month', occurred_on), 'YYYY-MM') AS month, type, SUM(amount_minor) AS total")->get();
        $monthlyIndex = [];
        foreach ($monthlyRows as $row) {
            $monthlyIndex[$row->month][$row->type->value] = (int) $row->total;
        }
        $trend = [];
        for ($offset = 5; $offset >= 0; $offset--) {
            $month = $start->subMonths($offset)->format('Y-m');
            $trend[] = ['month' => $month, 'income' => $monthlyIndex[$month]['income'] ?? 0, 'expense' => $monthlyIndex[$month]['expense'] ?? 0];
        }
        $expenseCategories = [];
        $incomeCategories = [];
        foreach ($categoryTotals as $row) {
            $serialized = ['id' => $row->id, 'name' => $row->name, 'total' => (int) $row->total];
            if ($row->type->value === 'expense') {
                $expenseCategories[] = $serialized;
            } else {
                $incomeCategories[] = $serialized;
            }
        }

        return [
            'current_month' => ['income' => $income, 'expense' => $expense, 'net_activity' => $income - $expense],
            'previous_month' => ['income' => (int) ($totals->previous_income ?? 0), 'expense' => (int) ($totals->previous_expense ?? 0)],
            'accounts' => $accounts,
            'spending_by_category' => $expenseCategories,
            'income_by_category' => $incomeCategories,
            'spending_by_pet' => $petSpending->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'total' => (int) $row->total])->values(),
            'monthly_trend' => $trend,
            'recent_transactions' => LedgerTransaction::query()->where('ledger_id', $ledger->id)->with(['account', 'category', 'ledger.currency', 'creator', 'petLinks.pet', 'media'])->orderByDesc('occurred_on')->orderByDesc('id')->limit(5)->get()->map(fn (LedgerTransaction $transaction) => $this->transactions->serialize($transaction))->values(),
        ];
    }
}
