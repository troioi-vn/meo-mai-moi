<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Exceptions\PlacementQuestionException;
use Illuminate\Http\JsonResponse;

trait MapsPlacementQuestionExceptions
{
    protected function placementQuestionExceptionResponse(PlacementQuestionException $exception): JsonResponse
    {
        $code = $exception->getMessage();

        $status = match ($code) {
            'listing_not_open' => 422,
            'nothing_to_publish' => 422,
            'invalid_confirmation_token' => 422,
            'too_many_pending_questions' => 429,
            default => 409,
        };

        return $this->sendError(__('messages.placement_questions.errors.'.$code), $status, ['code' => $code]);
    }
}
