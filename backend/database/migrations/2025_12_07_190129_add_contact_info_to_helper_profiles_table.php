<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds contact_info field for additional contact information.
     * This info will be visible to pet owners when helpers respond to placement requests.
     */
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->text('contact_info')->nullable()->after('phone_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropColumn('contact_info');
        });
    }
};
