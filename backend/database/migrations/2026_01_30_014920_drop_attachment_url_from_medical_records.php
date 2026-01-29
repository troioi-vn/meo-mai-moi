<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_records', function (Blueprint $table): void {
            $table->dropColumn('attachment_url');
        });
    }

    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table): void {
            $table->string('attachment_url', 2048)->nullable()->after('vet_name');
        });
    }
};
