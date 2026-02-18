<?php

declare(strict_types=1);

namespace App\Support;

final class TranslatableSql
{
    /**
     * @return array<int, string>
     */
    public static function localeChain(): array
    {
        $primary = app()->getLocale();
        $fallback = config('app.fallback_locale', 'en');

        return array_values(array_unique(array_filter([
            is_string($primary) ? $primary : null,
            is_string($fallback) ? $fallback : null,
            'en',
        ])));
    }

    /**
     * @return array{0: string, 1: array<int, string>}
     */
    public static function coalescedNameExpression(string $column = 'name'): array
    {
        $bindings = self::localeChain();
        $parts = array_fill(0, count($bindings), "{$column}->>?");

        return ['COALESCE('.implode(', ', $parts).')', $bindings];
    }

    /**
     * @return array{0: string, 1: array<int, string>}
     */
    public static function coalescedNameILike(string $search, string $column = 'name'): array
    {
        [$expression, $bindings] = self::coalescedNameExpression($column);

        return ["{$expression} ILIKE ?", [...$bindings, "%{$search}%"]];
    }
}
