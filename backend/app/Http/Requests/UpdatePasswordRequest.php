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
                        $fail('This account has no password set. Please use the password reset option to set one.');

                        return;
                    }
                    if (! Hash::check($value, $user->password)) {
                        $fail('The provided password does not match your current password.');
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
            'new_password.min' => 'The new password must be at least 8 characters.',
            'new_password.confirmed' => 'The new password confirmation does not match.',
        ];
    }
}
