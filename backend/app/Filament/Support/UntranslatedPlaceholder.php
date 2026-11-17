<?php

declare(strict_types=1);

namespace App\Filament\Support;

use Closure;
use Illuminate\Database\Eloquent\Model;

/**
 * Since spatie-translatable 2.1.2, a translatable column shows an empty cell
 * when the active table locale has no translation. Show the fallback-locale
 * value as the column's gray placeholder instead, so the row stays readable
 * and the missing translation stays visible.
 *
 * The plugin's useFallbackLocale() would also fill the cell, but the edit
 * form reads the same flag and would save the fallback text into every locale.
 */
final class UntranslatedPlaceholder
{
    public static function for(string $attribute): Closure
    {
        return fn (Model $record): ?string => method_exists($record, 'getTranslation')
            ? ($record->getTranslation($attribute, (string) config('app.fallback_locale'), false) ?: null)
            : null;
    }
}
