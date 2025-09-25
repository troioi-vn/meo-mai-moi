<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('placement_requests', 'fulfilled_at')) {
                $table->timestamp('fulfilled_at')->nullable()->after('end_date');
            }
            if (! Schema::hasColumn('placement_requests', 'fulfilled_by_transfer_request_id')) {
                $table->unsignedBigInteger('fulfilled_by_transfer_request_id')->nullable()->after('fulfilled_at');
                $table->foreign('fulfilled_by_transfer_request_id')
                    ->references('id')->on('transfer_requests')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('placement_requests', function (Blueprint $table) {
            if (Schema::hasColumn('placement_requests', 'fulfilled_by_transfer_request_id')) {
                $table->dropForeign(['fulfilled_by_transfer_request_id']);
                $table->dropColumn('fulfilled_by_transfer_request_id');
            }
            if (Schema::hasColumn('placement_requests', 'fulfilled_at')) {
                $table->dropColumn('fulfilled_at');
            }
        });
    }
};
