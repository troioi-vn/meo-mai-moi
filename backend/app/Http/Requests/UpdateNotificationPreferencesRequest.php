<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\NotificationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationPreferencesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled by auth:sanctum middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $validNotificationTypes = array_map(fn ($case) => $case->value, NotificationType::cases());

        return [
            'preferences' => 'present|array',
            'preferences.*.type' => [
                'required',
                'string',
                Rule::in($validNotificationTypes),
            ],
            'preferences.*.email_enabled' => 'required|boolean',
            'preferences.*.in_app_enabled' => 'required|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'preferences.*.type.required' => 'The notification type is required.',
            'preferences.*.type.in' => 'The selected notification type is invalid.',
            'preferences.*.email_enabled.required' => 'The email enabled preference is required.',
            'preferences.*.email_enabled.boolean' => 'The email enabled preference must be true or false.',
            'preferences.*.in_app_enabled.required' => 'The in-app enabled preference is required.',
            'preferences.*.in_app_enabled.boolean' => 'The in-app enabled preference must be true or false.',
        ];
    }
}
