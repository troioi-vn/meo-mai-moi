<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('helper_profile_photos');
    }

    public function down(): void
    {
        Schema::create('helper_profile_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('helper_profile_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->timestamps();
        });
    }
};
