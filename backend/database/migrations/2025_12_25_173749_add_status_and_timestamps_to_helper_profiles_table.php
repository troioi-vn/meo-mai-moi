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
        Schema::table('helper_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('helper_profiles', 'status')) {
                $table->string('status')->default('active')->after('approval_status');
            }

            if (! Schema::hasColumn('helper_profiles', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('updated_at');
            }

            if (! Schema::hasColumn('helper_profiles', 'restored_at')) {
                $table->timestamp('restored_at')->nullable()->after('archived_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $columns = array_values(array_filter([
                Schema::hasColumn('helper_profiles', 'status') ? 'status' : null,
                Schema::hasColumn('helper_profiles', 'archived_at') ? 'archived_at' : null,
                Schema::hasColumn('helper_profiles', 'restored_at') ? 'restored_at' : null,
            ]));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
