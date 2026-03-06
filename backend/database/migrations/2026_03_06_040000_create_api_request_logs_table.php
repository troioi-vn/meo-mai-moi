<?php

declare(strict_types=1);

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
        Schema::create('api_request_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('method', 10);
            $table->string('path', 255);
            $table->string('route_uri', 255)->nullable();
            $table->unsignedSmallInteger('status_code');
            $table->string('auth_mode', 20)->default('none');
            $table->timestamps();

            $table->index('created_at');
            $table->index('route_uri');
            $table->index('status_code');
            $table->index('auth_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_request_logs');
    }
};
