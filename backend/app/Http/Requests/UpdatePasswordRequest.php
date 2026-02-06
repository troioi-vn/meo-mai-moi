<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

class UpdatePasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => [
                'required',
                'string',
                function ($attribute, $value, $fail): void {
                    $user = $this->user();
                    // Check if user has no password set (e.g., OAuth user)
                    if (empty($user->password)) {
                        $fail(__('validation.password.no_password_set'));

                        return;
                    }
                    if (! Hash::check($value, $user->password)) {
                        $fail(__('validation.password.current_incorrect'));
                    }
                },
            ],
            'new_password' => 'required|string|min:8|confirmed',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'new_password.min' => __('validation.password.min'),
            'new_password.confirmed' => __('validation.password.confirmed'),
        ];
    }
}
