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
        Schema::table('email_logs', function (Blueprint $table) {
            // Add timestamp columns for Mailgun event tracking
            $table->timestamp('opened_at')->nullable()->after('delivered_at');
            $table->timestamp('clicked_at')->nullable()->after('opened_at');
            $table->timestamp('unsubscribed_at')->nullable()->after('clicked_at');
            $table->timestamp('complained_at')->nullable()->after('unsubscribed_at');
            $table->timestamp('permanent_fail_at')->nullable()->after('complained_at');

            // Add indexes for common queries
            $table->index(['status', 'opened_at'], 'email_logs_status_opened_at_index');
            $table->index(['status', 'clicked_at'], 'email_logs_status_clicked_at_index');
        });

        // Rename 'sent' status to 'accepted' for all existing records
        // Note: We're keeping historical data but updating the naming
        DB::statement("UPDATE email_logs SET status = 'accepted' WHERE status = 'sent'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('email_logs_status_opened_at_index');
            $table->dropIndex('email_logs_status_clicked_at_index');

            // Drop columns
            $table->dropColumn([
                'opened_at',
                'clicked_at',
                'unsubscribed_at',
                'complained_at',
                'permanent_fail_at',
            ]);
        });

        // Revert 'accepted' status back to 'sent'
        DB::statement("UPDATE email_logs SET status = 'sent' WHERE status = 'accepted'");
    }
};
