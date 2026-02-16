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
            'preferences.*.telegram_enabled' => 'sometimes|boolean',
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
            'preferences.*.type.required' => __('validation.notification.type_required'),
            'preferences.*.type.in' => __('validation.notification.type_invalid'),
            'preferences.*.email_enabled.required' => __('validation.notification.email_enabled_required'),
            'preferences.*.email_enabled.boolean' => __('validation.notification.email_enabled_boolean'),
            'preferences.*.in_app_enabled.required' => __('validation.notification.in_app_enabled_required'),
            'preferences.*.in_app_enabled.boolean' => __('validation.notification.in_app_enabled_boolean'),
        ];
    }
}
