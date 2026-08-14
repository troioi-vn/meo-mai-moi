<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreErrorEventRequest extends FormRequest
{
    private const MAX_CONTEXT_BYTES = 16384;

    private const MAX_CONTEXT_STRING_LENGTH = 2000;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:2000'],
            'exception_class' => ['nullable', 'string', 'max:255'],
            'stack' => ['nullable', 'string', 'max:20000'],
            'route' => ['required', 'string', 'max:2048'],
            'method' => ['nullable', 'string', 'max:10', 'regex:/^[A-Z]+$/'],
            'status_code' => ['nullable', 'integer', 'between:100,599'],
            'app_version' => ['nullable', 'string', 'max:100'],
            'context' => ['nullable', 'array', 'max:100'],
            'occurred_at' => ['nullable', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $context = $this->input('context');
            if (! is_array($context)) {
                return;
            }

            $encoded = json_encode($context);
            if ($encoded === false || strlen($encoded) > self::MAX_CONTEXT_BYTES) {
                $validator->errors()->add('context', __('messages.error_events.context_size'));

                return;
            }

            if ($this->containsOversizedString($context)) {
                $validator->errors()->add('context', __('messages.error_events.context_string_size'));
            }
        });
    }

    /** @param array<array-key, mixed> $values */
    private function containsOversizedString(array $values): bool
    {
        foreach ($values as $key => $value) {
            if (is_string($key) && mb_strlen($key) > self::MAX_CONTEXT_STRING_LENGTH) {
                return true;
            }

            if (is_string($value) && mb_strlen($value) > self::MAX_CONTEXT_STRING_LENGTH) {
                return true;
            }

            if (is_array($value) && $this->containsOversizedString($value)) {
                return true;
            }
        }

        return false;
    }
}
