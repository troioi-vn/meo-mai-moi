<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

class StorePushSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'endpoint' => ['required', 'string', 'max:2048'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:512'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'content_encoding' => ['nullable', 'string', 'max:32'],
            'expiration_time' => ['nullable'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $expiration = $this->input('expiration_time');

            if ($expiration === null || $expiration === '') {
                return;
            }

            if (! is_numeric($expiration) && ! is_string($expiration)) {
                $validator->errors()->add('expiration_time', 'The expiration time must be a valid date or timestamp.');

                return;
            }

            try {
                if (is_numeric($expiration)) {
                    Carbon::createFromTimestampMs((int) $expiration);

                    return;
                }

                Carbon::parse($expiration);
            } catch (\Throwable) {
                $validator->errors()->add('expiration_time', 'The expiration time must be a valid date or timestamp.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('expirationTime')) {
            $this->merge([
                'expiration_time' => $this->input('expirationTime'),
            ]);
        }

        if ($this->has('contentEncoding')) {
            $this->merge([
                'content_encoding' => $this->input('contentEncoding'),
            ]);
        }
    }

    protected function passedValidation(): void
    {
        $expiration = $this->input('expiration_time');
        if (is_numeric($expiration)) {
            $this->merge([
                'expiration_time' => Carbon::createFromTimestampMs((int) $expiration),
            ]);
        } elseif (is_string($expiration)) {
            $this->merge([
                'expiration_time' => Carbon::parse($expiration),
            ]);
        }
    }
}
