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
        Schema::create('currencies', function (Blueprint $table): void {
            $table->char('code', 3)->primary();
            $table->string('name');
            $table->string('symbol', 16);
            $table->unsignedSmallInteger('minor_units');
            $table->boolean('enabled')->default(false);
            $table->timestamps();
            $table->index(['enabled', 'code']);
        });

        Schema::create('ledgers', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->char('currency_code', 3);
            $table->unsignedBigInteger('group_id')->nullable();
            $table->boolean('sync_group_pets')->default(false);
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestampTz('archived_at')->nullable();
            $table->timestamps();
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
            $table->index(['group_id', 'sync_group_pets']);
            $table->index('archived_at');
        });

        Schema::create('ledger_memberships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('start_at');
            $table->timestampTz('end_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'end_at']);
            $table->index(['ledger_id', 'end_at']);
        });

        Schema::create('ledger_pet_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->string('source');
            $table->unsignedBigInteger('source_group_id')->nullable();
            $table->foreignId('added_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('start_at');
            $table->timestampTz('end_at')->nullable();
            $table->timestamps();
            $table->index(['ledger_id', 'pet_id', 'end_at']);
            $table->index(['source_group_id', 'end_at']);
        });

        Schema::create('ledger_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestampTz('archived_at')->nullable();
            $table->timestamps();
            $table->index(['ledger_id', 'archived_at']);
        });

        Schema::create('ledger_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->string('name');
            $table->string('applies_to');
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestampTz('archived_at')->nullable();
            $table->timestamps();
            $table->index(['ledger_id', 'applies_to', 'archived_at']);
        });

        Schema::create('ledger_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('ledger_categories')->restrictOnDelete();
            $table->string('type');
            $table->bigInteger('amount_minor');
            $table->date('occurred_on');
            $table->text('description')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['ledger_id', 'occurred_on', 'id']);
            $table->index(['ledger_id', 'type', 'occurred_on']);
            $table->index(['ledger_id', 'account_id', 'occurred_on']);
            $table->index(['ledger_id', 'category_id', 'occurred_on']);
        });

        Schema::create('ledger_transaction_pets', function (Blueprint $table): void {
            $table->foreignId('ledger_transaction_id')->constrained('ledger_transactions')->cascadeOnDelete();
            $table->foreignId('pet_id')->nullable()->constrained('pets')->nullOnDelete();
            $table->string('pet_name_snapshot');
            $table->timestamps();
            $table->unique(['ledger_transaction_id', 'pet_id']);
            $table->index(['pet_id', 'ledger_transaction_id']);
        });

        Schema::create('ledger_transaction_health_links', function (Blueprint $table): void {
            $table->foreignId('ledger_transaction_id')->primary()->constrained('ledger_transactions')->cascadeOnDelete();
            $table->foreignId('medical_record_id')->nullable()->unique()->constrained('medical_records')->cascadeOnDelete();
            $table->foreignId('vaccination_record_id')->nullable()->unique()->constrained('vaccination_records')->cascadeOnDelete();
            $table->foreignId('pet_microchip_id')->nullable()->unique()->constrained('pet_microchips')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('ledger_resource_invitations', function (Blueprint $table): void {
            $table->unsignedBigInteger('resource_invitation_id')->primary();
            $table->foreignId('ledger_id')->constrained('ledgers')->cascadeOnDelete();
            $table->timestamps();
            $table->index('ledger_id');
        });

        DB::statement('CREATE UNIQUE INDEX ledger_memberships_unique_active ON ledger_memberships (ledger_id, user_id) WHERE end_at IS NULL');
        DB::statement("CREATE UNIQUE INDEX ledger_pet_manual_unique_active ON ledger_pet_assignments (ledger_id, pet_id) WHERE end_at IS NULL AND source = 'manual'");
        DB::statement("CREATE UNIQUE INDEX ledger_pet_group_sync_unique_active ON ledger_pet_assignments (ledger_id, pet_id, source_group_id) WHERE end_at IS NULL AND source = 'group_sync'");
        DB::statement("ALTER TABLE ledger_pet_assignments ADD CONSTRAINT ledger_pet_source_group_check CHECK ((source = 'manual' AND source_group_id IS NULL) OR (source = 'group_sync' AND source_group_id IS NOT NULL))");
        DB::statement('ALTER TABLE ledger_pet_assignments ADD CONSTRAINT ledger_pet_assignment_dates_check CHECK (end_at IS NULL OR end_at >= start_at)');
        DB::statement('ALTER TABLE ledger_memberships ADD CONSTRAINT ledger_membership_dates_check CHECK (end_at IS NULL OR end_at >= start_at)');
        DB::statement("ALTER TABLE ledger_categories ADD CONSTRAINT ledger_categories_applies_to_check CHECK (applies_to IN ('income', 'expense', 'both'))");
        DB::statement("ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_type_check CHECK (type IN ('income', 'expense'))");
        DB::statement('ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_amount_positive CHECK (amount_minor > 0)');
        DB::statement('ALTER TABLE ledger_transaction_health_links ADD CONSTRAINT ledger_health_link_exactly_one CHECK (num_nonnulls(medical_record_id, vaccination_record_id, pet_microchip_id) = 1)');
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_resource_invitations');
        Schema::dropIfExists('ledger_transaction_health_links');
        Schema::dropIfExists('ledger_transaction_pets');
        Schema::dropIfExists('ledger_transactions');
        Schema::dropIfExists('ledger_categories');
        Schema::dropIfExists('ledger_accounts');
        Schema::dropIfExists('ledger_pet_assignments');
        Schema::dropIfExists('ledger_memberships');
        Schema::dropIfExists('ledgers');
        Schema::dropIfExists('currencies');
    }
};
