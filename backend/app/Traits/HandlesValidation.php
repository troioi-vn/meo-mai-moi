<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

trait HandlesValidation
{
    /**
     * Common validation rules for dates.
    *
    * @return list<string>
     */
    protected function dateValidationRules(bool $required = true, bool $allowFuture = true): array
    {
        $rules = $required ? ['required', 'date'] : ['nullable', 'date'];

        if (! $allowFuture) {
            $rules[] = 'before_or_equal:today';
        }

        return $rules;
    }

    /**
     * Common validation rules for email.
        *
        * @return list<string>
     */
    protected function emailValidationRules(bool $required = true, ?string $uniqueTable = null, ?int $ignoreId = null): array
    {
        $rules = $required ? ['required', 'email', 'max:255'] : ['nullable', 'email', 'max:255'];

        if ($uniqueTable) {
            $unique = "unique:{$uniqueTable},email";
            if ($ignoreId) {
                $unique .= ",{$ignoreId}";
            }
            $rules[] = $unique;
        }

        return $rules;
    }

    /**
     * Common validation rules for text fields.
        *
        * @return list<string>
     */
    protected function textValidationRules(bool $required = true, int $maxLength = 255): array
    {
        $rules = $required ? ['required', 'string'] : ['nullable', 'string'];

        if ($maxLength > 0) {
            $rules[] = "max:{$maxLength}";
        }

        return $rules;
    }

    /**
     * Common validation rules for numeric fields.
        *
        * @return list<string>
     */
    protected function numericValidationRules(bool $required = true, ?float $min = null, ?float $max = null): array
    {
        $rules = $required ? ['required', 'numeric'] : ['nullable', 'numeric'];

        if ($min !== null) {
            $rules[] = "min:{$min}";
        }

        if ($max !== null) {
            $rules[] = "max:{$max}";
        }

        return $rules;
    }

    /**
     * Common validation rules for image uploads.
        *
        * @return list<string>
     */
    protected function imageValidationRules(bool $required = true, int $maxSizeKb = 10240): array
    {
        $rules = $required ? ['required', 'image'] : ['nullable', 'image'];
        $rules[] = 'mimes:jpeg,png,jpg,gif,svg';
        $rules[] = "max:{$maxSizeKb}";

        return $rules;
    }

    /**
     * Validate request with enhanced error handling.
        *
        * @param array<string, mixed> $rules
        * @param array<string, string> $messages
        * @param array<string, string> $attributes
        * @return array<string, mixed>
     */
    protected function validateWithErrorHandling(Request $request, array $rules, array $messages = [], array $attributes = []): array
    {
        try {
            return $request->validate($rules, $messages, $attributes);
        } catch (ValidationException $e) {
            \Log::debug('Validation failed', [
                'errors' => $e->errors(),
                'input' => $this->sanitizeValidationInput($request->all()),
            ]);

            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function sanitizeValidationInput(array $input): array
    {
        $sanitized = [];

        foreach ($input as $key => $value) {
            $sanitized[$key] = $this->shouldRedactValidationKey((string) $key)
                ? '[REDACTED]'
                : (is_array($value) ? $this->sanitizeValidationInput($value) : $value);
        }

        return $sanitized;
    }

    private function shouldRedactValidationKey(string $key): bool
    {
        $normalizedKey = strtolower(str_replace('-', '_', $key));

        if (in_array($normalizedKey, ['code', 'password', 'password_confirmation', 'session_sig', 'signature', 'secret', 'token'], true)) {
            return true;
        }

        return str_contains($normalizedKey, 'password')
            || str_ends_with($normalizedKey, '_token')
            || str_ends_with($normalizedKey, '_secret')
            || str_ends_with($normalizedKey, '_signature');
    }

    /**
     * Validate existence of related model.
     */
    protected function validateModelExists(string $model, mixed $id, string $field = 'id'): void
    {
        if (! $model::where($field, $id)->exists()) {
            abort(404, class_basename($model).' not found.');
        }
    }

    /**
     * Common validation for password confirmation.
        *
        * @return list<string>
     */
    protected function passwordValidationRules(bool $requireConfirmation = true, int $minLength = 8): array
    {
        $rules = ['required', 'string', "min:{$minLength}"];

        if ($requireConfirmation) {
            $rules[] = 'confirmed';
        }

        return $rules;
    }

    /**
     * Validate uniqueness with custom conditions.
        *
        * @param array<string, scalar|null> $conditions
     */
    protected function uniqueValidationRule(string $table, string $column, array $conditions = [], ?int $ignoreId = null): string
    {
        $rule = "unique:{$table},{$column}";

        if ($ignoreId) {
            $rule .= ",{$ignoreId}";
        }

        foreach ($conditions as $field => $value) {
            $rule .= ",{$field},{$value}";
        }

        return $rule;
    }
}
