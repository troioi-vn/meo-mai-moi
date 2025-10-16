<?php

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

trait HandlesValidation
{
    /**
     * Common validation rules for dates.
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
     */
    protected function validateWithErrorHandling(Request $request, array $rules, array $messages = [], array $attributes = []): array
    {
        try {
            return $request->validate($rules, $messages, $attributes);
        } catch (ValidationException $e) {
            // Log validation errors for debugging
            \Log::info('Validation failed', [
                'errors' => $e->errors(),
                'input' => $request->except(['password', 'password_confirmation']),
            ]);

            throw $e;
        }
    }

    /**
     * Validate existence of related model.
     */
    protected function validateModelExists(string $model, $id, string $field = 'id'): void
    {
        if (! $model::where($field, $id)->exists()) {
            abort(404, class_basename($model).' not found.');
        }
    }

    /**
     * Common validation for password confirmation.
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
