<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group\Concerns;

use App\Exceptions\GroupException;
use Illuminate\Http\JsonResponse;

trait MapsGroupExceptions
{
    protected function groupExceptionResponse(GroupException $exception): JsonResponse
    {
        $code = $exception->getMessage();

        $status = match ($code) {
            'last_admin_required',
            'already_a_member',
            'pet_already_assigned',
            'pet_has_live_placement' => 422,
            default => 403,
        };

        return $this->sendError(__('groups.'.$code), $status);
    }
}
