<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('error_events', function (Blueprint $table): void {
            $table->id();
            $table->string('source', 20);
            $table->string('fingerprint', 64);
            $table->text('message');
            $table->string('exception_class', 255)->nullable();
            $table->text('stack')->nullable();
            $table->string('route', 2048);
            $table->string('method', 10)->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('app_version', 100)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->jsonb('context')->nullable();
            $table->timestampTz('occurred_at');
            $table->timestampsTz();

            $table->index('fingerprint');
            $table->index('occurred_at');
            $table->index(['source', 'occurred_at']);
            $table->index(['fingerprint', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('error_events');
    }
};
