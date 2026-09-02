<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnswerPlacementQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The policy check lives in the controller so the failure is a clean
        // 403 rather than a validation error.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'answer' => ['required', 'string', 'min:1', 'max:'.config('placement_questions.answer_max_length', 2000)],
        ];
    }
}
