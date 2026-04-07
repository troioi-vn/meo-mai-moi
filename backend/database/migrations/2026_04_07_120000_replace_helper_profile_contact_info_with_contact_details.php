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
            $table->jsonb('contact_details')->nullable()->after('phone_number');
        });

        DB::table('helper_profiles')
            ->whereNotNull('contact_info')
            ->whereRaw("btrim(contact_info) <> ''")
            ->update([
                'contact_details' => DB::raw(
                    "jsonb_build_array(jsonb_build_object('type', 'other', 'value', btrim(contact_info)))"
                ),
            ]);

        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->dropColumn('contact_info');
        });
    }

    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->text('contact_info')->nullable()->after('phone_number');
        });

        DB::statement(<<<'SQL'
            UPDATE helper_profiles
            SET contact_info = aggregated.contact_info
            FROM (
                SELECT
                    id,
                    string_agg(
                        CASE
                            WHEN item->>'type' = 'other' THEN item->>'value'
                            ELSE initcap(replace(item->>'type', '_', ' ')) || ': ' || item->>'value'
                        END,
                        E'\n'
                        ORDER BY ordinality
                    ) AS contact_info
                FROM helper_profiles
                CROSS JOIN LATERAL jsonb_array_elements(contact_details) WITH ORDINALITY AS item(item, ordinality)
                WHERE contact_details IS NOT NULL
                    AND jsonb_typeof(contact_details) = 'array'
                    AND jsonb_array_length(contact_details) > 0
                GROUP BY id
            ) AS aggregated
            WHERE helper_profiles.id = aggregated.id
        SQL);

        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->dropColumn('contact_details');
        });
    }
};
