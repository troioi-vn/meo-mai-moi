<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Domain exception for pet-creation validation that the controller maps to 422.
 * The message key is matched in the controller to preserve translated messages verbatim.
 */
final class InvalidPetDataException extends Exception
{
    public const CITY_NOT_FOUND = 'city_not_found';

    public const CITY_COUNTRY_MISMATCH = 'city_country_mismatch';

    public const INVALID_CATEGORIES = 'invalid_categories';

    private function __construct(string $code)
    {
        parent::__construct($code);
    }

    public static function cityNotFound(): self
    {
        return new self(self::CITY_NOT_FOUND);
    }

    public static function cityCountryMismatch(): self
    {
        return new self(self::CITY_COUNTRY_MISMATCH);
    }

    public static function invalidCategories(): self
    {
        return new self(self::INVALID_CATEGORIES);
    }
}
