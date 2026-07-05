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
        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->string('experience_locale', 5)->nullable()->after('experience');
        });

        Schema::table('placement_requests', function (Blueprint $table): void {
            $table->string('notes_locale', 5)->nullable()->after('notes');
        });

        DB::table('helper_profiles')
            ->whereNotNull('experience')
            ->where('experience', '!=', '')
            ->update(['experience_locale' => 'en']);

        DB::table('placement_requests')
            ->whereNotNull('notes')
            ->where('notes', '!=', '')
            ->update(['notes_locale' => 'en']);

        Schema::create('content_translations', function (Blueprint $table): void {
            $table->id();
            $table->string('translatable_type');
            $table->unsignedBigInteger('translatable_id');
            $table->string('field');
            $table->string('source_locale', 5);
            $table->string('source_hash', 64);
            $table->jsonb('text')->nullable();
            $table->string('status')->default('pending');
            $table->text('error')->nullable();
            $table->timestamp('translated_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['translatable_type', 'translatable_id', 'field'],
                'content_translations_unique_field'
            );
            $table->index(['translatable_type', 'translatable_id'], 'content_translations_model_index');
            $table->index(['status', 'updated_at'], 'content_translations_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_translations');

        Schema::table('placement_requests', function (Blueprint $table): void {
            $table->dropColumn('notes_locale');
        });

        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->dropColumn('experience_locale');
        });
    }
};
