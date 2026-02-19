<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Country;
use App\Support\CountryCatalog;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $codes = CountryCatalog::allIsoCodes();

        if ($codes === []) {
            return;
        }

        foreach ($codes as $code) {
            Country::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $code,
                    'phone_prefix' => CountryCatalog::phonePrefix($code),
                    'is_active' => true,
                ]
            );
        }
    }
}
