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
        $countries = self::countriesBundleForLocale('en');

        if ($countries === null) {
            return [];
        }

        $codes = [];
        foreach ($countries as $code => $_name) {
            if (self::isIsoCountryCode($code)) {
                $codes[] = $code;
            }
        }

        sort($codes);

        return array_values(array_unique($codes));
    }

    public static function localizedName(string $countryCode, string $locale): string
    {
        $countryCode = strtoupper($countryCode);
        $countries = self::countriesBundleForLocale($locale);

        if ($countries === null) {
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
        } catch (\Throwable $exception) {
            report($exception);
        }

        $fallback = config('country_phone_prefixes.'.$countryCode);

        return is_string($fallback) && $fallback !== '' ? $fallback : null;
    }

    private static function countriesBundleForLocale(string $locale): ?ResourceBundle
    {
        $bundle = ResourceBundle::create($locale, 'ICUDATA-region');

        if (! $bundle) {
            return null;
        }

        $countries = $bundle->get('Countries');

        return $countries instanceof ResourceBundle ? $countries : null;
    }

    private static function isIsoCountryCode(mixed $code): bool
    {
        return is_string($code) && strlen($code) === 2 && strtoupper($code) === $code;
    }
}
