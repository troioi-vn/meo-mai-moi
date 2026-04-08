<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class HelperProfileAdminNotificationService
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function notifyCreated(HelperProfile $helperProfile, User $actor): void
    {
        $this->notify($helperProfile, $actor, 'helper_profile_created', "New Helper Profile created by {$actor->name}: {$this->getProfileLabel($helperProfile)}");
    }

    public function notifyUpdated(HelperProfile $helperProfile, User $actor): void
    {
        $this->notify($helperProfile, $actor, 'helper_profile_updated', "Helper Profile updated by {$actor->name}: {$this->getProfileLabel($helperProfile)}");
    }

    private function notify(HelperProfile $helperProfile, User $actor, string $type, string $message): void
    {
        $superAdmins = User::whereHas('roles', function ($query): void {
            $query->where('name', 'super_admin');
        })->get();

        foreach ($superAdmins as $superAdmin) {
            try {
                $this->notificationService->sendInApp($superAdmin, $type, [
                    'message' => $message,
                    'link' => url("/admin/helper-profiles/{$helperProfile->id}/edit"),
                    'helper_profile_id' => $helperProfile->id,
                    'actor_id' => $actor->id,
                ]);
            } catch (\Throwable $exception) {
                Log::warning('Failed to send helper profile admin notification', [
                    'super_admin_id' => $superAdmin->id,
                    'helper_profile_id' => $helperProfile->id,
                    'type' => $type,
                    'exception' => $exception,
                ]);
            }
        }
    }

    private function getProfileLabel(HelperProfile $helperProfile): string
    {
        $helperProfile->loadMissing('user');

        $ownerName = trim((string) $helperProfile->user?->name);
        $city = trim((string) $helperProfile->city);

        if ($ownerName !== '' && $city !== '') {
            return "{$ownerName} ({$city})";
        }

        if ($ownerName !== '') {
            return $ownerName;
        }

        if ($city !== '') {
            return "Profile #{$helperProfile->id} ({$city})";
        }

        return "Profile #{$helperProfile->id}";
    }
}