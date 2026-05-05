<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\WaitlistEntry;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WaitlistConfirmationRequested
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public WaitlistEntry $waitlistEntry,
        public string $email,
        public ?string $locale = null,
    ) {}
}