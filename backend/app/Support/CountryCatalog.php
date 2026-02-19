<?php

declare(strict_types=1);

namespace App\Support;

use libphonenumber\PhoneNumberUtil;
use ResourceBundle;

class CountryCatalog
{
    /**
     * @return list<string>
     */
    public static function allIsoCodes(): array
    {
        $bundle = ResourceBundle::create('en', 'ICUDATA-region');
        if (! $bundle) {
            return [];
        }

        $countries = $bundle->get('Countries');
        if (! $countries instanceof ResourceBundle) {
            return [];
        }

        $codes = [];
        foreach ($countries as $code => $_name) {
            if (is_string($code) && strlen($code) === 2 && strtoupper($code) === $code) {
                $codes[] = $code;
            }
        }

        sort($codes);

        return array_values(array_unique($codes));
    }

    public static function localizedName(string $countryCode, string $locale): string
    {
        $countryCode = strtoupper($countryCode);
        $bundle = ResourceBundle::create($locale, 'ICUDATA-region');

        if (! $bundle) {
            return $countryCode;
        }

        $countries = $bundle->get('Countries');
        if (! $countries instanceof ResourceBundle) {
            return $countryCode;
        }

        $name = $countries->get($countryCode);

        return is_string($name) && $name !== '' ? $name : $countryCode;
    }

    public static function phonePrefix(string $countryCode): ?string
    {
        $countryCode = strtoupper($countryCode);

        try {
            $util = PhoneNumberUtil::getInstance();
            $countryCallingCode = $util->getCountryCodeForRegion($countryCode);

            if ($countryCallingCode > 0) {
                return '+'.$countryCallingCode;
            }
        } catch (\Throwable) {
        }

        $fallback = config('country_phone_prefixes.'.$countryCode);

        return is_string($fallback) && $fallback !== '' ? $fallback : null;
    }
}
