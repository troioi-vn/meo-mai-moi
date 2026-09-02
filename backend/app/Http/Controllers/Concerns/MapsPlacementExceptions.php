<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Exceptions\PlacementException;
use Illuminate\Http\JsonResponse;

trait MapsPlacementExceptions
{
    protected function placementExceptionResponse(PlacementException $exception): JsonResponse
    {
        $code = $exception->getMessage();

        return $this->sendError(__('messages.placement.'.$code), 409, ['code' => $code]);
    }
}
