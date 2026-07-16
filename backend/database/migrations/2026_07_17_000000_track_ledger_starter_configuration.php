<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ledger_accounts', function (Blueprint $table): void {
            $table->boolean('is_starter')->default(false);
        });

        Schema::table('ledger_categories', function (Blueprint $table): void {
            $table->boolean('is_starter')->default(false);
        });

        $starterConfigurations = collect(['en', 'ru', 'uk', 'vi'])->map(function (string $locale): array {
            /** @var array{starter: array{cash: string, categories: array<string, list<string>>}} $translations */
            $translations = require lang_path("{$locale}/finance.php");
            $categories = collect($translations['starter']['categories'])
                ->flatMap(fn (array $names, string $appliesTo) => collect($names)
                    ->map(fn (string $name): string => "{$appliesTo}:{$name}"))
                ->sort()
                ->values()
                ->all();

            return ['cash' => $translations['starter']['cash'], 'categories' => $categories];
        });

        DB::table('ledgers')->orderBy('id')->each(function (object $ledger) use ($starterConfigurations): void {
            if ($ledger->group_id !== null
                || DB::table('ledger_transactions')->where('ledger_id', $ledger->id)->exists()
                || DB::table('ledger_pet_assignments')->where('ledger_id', $ledger->id)->exists()) {
                return;
            }

            $memberships = DB::table('ledger_memberships')->where('ledger_id', $ledger->id)->get();
            $accounts = DB::table('ledger_accounts')->where('ledger_id', $ledger->id)->get();
            $categories = DB::table('ledger_categories')->where('ledger_id', $ledger->id)->get();
            if ($memberships->count() !== 1
                || $memberships->first()?->user_id !== $ledger->created_by_user_id
                || $memberships->first()?->end_at !== null
                || $accounts->count() !== 1
                || $accounts->first()?->archived_at !== null
                || $categories->count() !== 10
                || $categories->contains(fn (object $category): bool => $category->archived_at !== null)) {
                return;
            }

            $categorySignature = $categories
                ->map(fn (object $category): string => "{$category->applies_to}:{$category->name}")
                ->sort()
                ->values()
                ->all();
            $matchesStarter = $starterConfigurations->contains(
                fn (array $starter): bool => $starter['cash'] === $accounts->first()?->name
                    && $starter['categories'] === $categorySignature
            );
            if (! $matchesStarter) {
                return;
            }

            DB::table('ledger_accounts')->where('ledger_id', $ledger->id)->update(['is_starter' => true]);
            DB::table('ledger_categories')->where('ledger_id', $ledger->id)->update(['is_starter' => true]);
        });
    }

    public function down(): void
    {
        Schema::table('ledger_categories', function (Blueprint $table): void {
            $table->dropColumn('is_starter');
        });

        Schema::table('ledger_accounts', function (Blueprint $table): void {
            $table->dropColumn('is_starter');
        });
    }
};
