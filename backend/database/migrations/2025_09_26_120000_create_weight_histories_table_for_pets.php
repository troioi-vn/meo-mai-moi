<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('weight_histories')) {
            Schema::create('weight_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
                $table->decimal('weight_kg', 8, 2);
                $table->date('record_date');
                $table->timestamps();

                $table->unique(['pet_id', 'record_date']);
            });
        } else {
            // If table exists from legacy, ensure columns match pet-based schema
            Schema::table('weight_histories', function (Blueprint $table) {
                if (! Schema::hasColumn('weight_histories', 'pet_id')) {
                    $table->unsignedBigInteger('pet_id')->nullable()->after('id');
                }

                // If legacy cat_id exists, make it nullable to avoid NOT NULL constraint issues in tests
                if (Schema::hasColumn('weight_histories', 'cat_id')) {
                    try {
                        // Prefer dropping the legacy column entirely if supported
                        $table->dropColumn('cat_id');
                    } catch (\Throwable $e) {
                        // Fallback: if drop not supported, at least make it nullable (requires doctrine/dbal in some drivers)
                        try {
                            $table->unsignedBigInteger('cat_id')->nullable()->change();
                        } catch (\Throwable $e2) {
                            // swallow; best-effort
                        }
                    }
                }
            });
            // Add unique index for (pet_id, record_date) if not already present
            Schema::table('weight_histories', function (Blueprint $table) {
                // Laravel doesn't provide a simple "hasIndex" check; rely on try/catch
                try {
                    $table->unique(['pet_id', 'record_date']);
                } catch (\Throwable $e) {
                    // ignore if already exists
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weight_histories');
    }
};
