<?php

declare(strict_types=1);

namespace App\Enums;

enum HelperProfileCreatedVia: string
{
    /** The user filled in the helper profile form themselves. */
    case FORM = 'form';

    /**
     * Created automatically so the user could answer a placement request
     * without building a profile first. Carries only what the request itself
     * implied, so owner-facing surfaces should treat unset fields as
     * "not stated" rather than as an answer.
     */
    case QUICK_RESPONSE = 'quick_response';
}
