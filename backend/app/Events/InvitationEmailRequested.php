<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvitationEmailRequested
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public Invitation $invitation,
        public User $inviter,
        public string $email,
        public ?string $locale = null,
    ) {}
}
