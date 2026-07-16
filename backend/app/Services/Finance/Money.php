<?php

declare(strict_types=1);

namespace App\Services\Finance;

use InvalidArgumentException;

final readonly class Money
{
    private function __construct(public int $minor, public int $minorUnits) {}

    public static function fromMajor(string $major, int $minorUnits): self
    {
        if ($minorUnits < 0 || $minorUnits > 6) {
            throw new InvalidArgumentException('Unsupported currency precision.');
        }

        $normalized = trim(str_replace(["\u{00A0}", ' '], '', $major));
        if ($normalized === '' || str_starts_with($normalized, '-')) {
            throw new InvalidArgumentException('Amount must be positive.');
        }
        if (str_contains($normalized, ',') && ! str_contains($normalized, '.')) {
            $normalized = str_replace(',', '.', $normalized);
        }
        if (! preg_match('/^\+?([0-9]+)(?:\.([0-9]+))?$/', $normalized, $matches)) {
            throw new InvalidArgumentException('Enter a valid amount.');
        }

        $fraction = $matches[2] ?? '';
        if (strlen($fraction) > $minorUnits) {
            throw new InvalidArgumentException("Amount supports at most {$minorUnits} decimal places.");
        }
        $factor = 10 ** $minorUnits;
        $whole = filter_var($matches[1], FILTER_VALIDATE_INT);
        if ($whole === false || $whole > intdiv(PHP_INT_MAX, $factor)) {
            throw new InvalidArgumentException('Amount is too large.');
        }
        $minor = ($whole * $factor) + (int) str_pad($fraction, $minorUnits, '0');
        if ($minor <= 0) {
            throw new InvalidArgumentException('Amount must be positive.');
        }

        return new self($minor, $minorUnits);
    }

    public static function fromMinor(int $minor, int $minorUnits): self
    {
        if ($minor <= 0) {
            throw new InvalidArgumentException('Amount must be positive.');
        }

        return new self($minor, $minorUnits);
    }

    public function toMajor(): string
    {
        if ($this->minorUnits === 0) {
            return (string) $this->minor;
        }
        $factor = 10 ** $this->minorUnits;

        return sprintf('%d.%0'.$this->minorUnits.'d', intdiv($this->minor, $factor), $this->minor % $factor);
    }
}
