<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Rules\SingleUseAltcha;
use Illuminate\Foundation\Http\FormRequest;

class StorePlacementQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Anyone may ask, including logged-out visitors. Whether the listing
        // accepts questions at all is a domain rule, checked in the service.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $altchaRules = $this->user() === null
            ? ['required', 'string', new SingleUseAltcha]
            : ['nullable', 'string'];

        return [
            'asker_name' => ['required', 'string', 'min:2', 'max:'.config('placement_questions.asker_name_max_length', 80)],
            // Optional by design: giving an address buys a notification, it is
            // never the price of asking.
            'asker_email' => ['nullable', 'email:rfc', 'max:255'],
            'question' => ['required', 'string', 'min:5', 'max:'.config('placement_questions.question_max_length', 1000)],
            'altcha' => $altchaRules,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'altcha.required' => __('validation.custom.altcha.required'),
        ];
    }
}
