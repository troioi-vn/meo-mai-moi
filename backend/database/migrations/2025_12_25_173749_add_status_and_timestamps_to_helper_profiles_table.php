<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->string('status')->default('active')->after('approval_status');
            $table->timestamp('archived_at')->nullable()->after('updated_at');
            $table->timestamp('restored_at')->nullable()->after('archived_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropColumn(['status', 'archived_at', 'restored_at']);
        });
    }
};
