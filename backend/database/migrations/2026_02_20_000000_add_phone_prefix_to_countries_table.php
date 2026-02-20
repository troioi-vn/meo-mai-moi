<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use libphonenumber\PhoneNumberUtil;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table): void {
            $table->string('phone_prefix', 8)->nullable()->after('name');
        });

        $codes = DB::table('countries')->pluck('code');
        $util = PhoneNumberUtil::getInstance();

        foreach ($codes as $code) {
            $region = strtoupper((string) $code);
            $callingCode = $util->getCountryCodeForRegion($region);
            if ($callingCode <= 0) {
                continue;
            }

            DB::table('countries')
                ->where('code', $region)
                ->update(['phone_prefix' => '+'.$callingCode]);
        }
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table): void {
            $table->dropColumn('phone_prefix');
        });
    }
};
