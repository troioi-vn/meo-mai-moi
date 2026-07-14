<?php

declare(strict_types=1);

namespace Tests\Unit\Finance;

use App\Services\Finance\Money;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    /** @return iterable<string, array{string, int, int, string}> */
    public static function validAmounts(): iterable
    {
        yield 'VND integer' => ['125000', 0, 125000, '125000'];
        yield 'USD decimal' => ['12.5', 2, 1250, '12.50'];
        yield 'comma decimal' => ['12,05', 2, 1205, '12.05'];
        yield 'three-decimal currency' => ['1.234', 3, 1234, '1.234'];
    }

    #[DataProvider('validAmounts')]
    public function test_it_converts_major_units_without_floating_point_arithmetic(string $major, int $precision, int $minor, string $roundTrip): void
    {
        $money = Money::fromMajor($major, $precision);
        self::assertSame($minor, $money->minor);
        self::assertSame($roundTrip, $money->toMajor());
    }

    public function test_zero_decimal_currency_rejects_fractional_input(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromMajor('100.1', 0);
    }

    /** @return iterable<string, array{string, int}> */
    public static function invalidAmounts(): iterable
    {
        yield 'negative' => ['-1', 2];
        yield 'zero' => ['0', 2];
        yield 'too precise' => ['1.001', 2];
        yield 'grouped input' => ['1,000.00', 2];
        yield 'overflow' => [(string) PHP_INT_MAX, 2];
    }

    #[DataProvider('invalidAmounts')]
    public function test_it_rejects_invalid_or_overflowing_amounts(string $major, int $precision): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::fromMajor($major, $precision);
    }
}
