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
        DB::table('helper_profiles')
            ->where('status', 'active')
            ->update(['status' => 'private']);

        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->string('status')->default('private')->change();
        });
    }

    public function down(): void
    {
        DB::table('helper_profiles')
            ->where('status', 'private')
            ->update(['status' => 'active']);

        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->string('status')->default('active')->change();
        });
    }
};
