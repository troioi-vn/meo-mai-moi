<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\NotificationType;
use App\Models\PlacementRequestResponse;
use App\Models\User;

class PlacementResponseLifecycleService
{
    public function __construct(
        private readonly NotificationService $notificationService
    ) {}

    public function accept(PlacementRequestResponse $response, ?User $actor = null): bool
    {
        if (! $response->accept($actor)) {
            return false;
        }

        $placementRequest = $response->placementRequest;
        $pet = $placementRequest->pet;
        $needsHandover = in_array(
            $placementRequest->request_type->value,
            ['permanent', 'foster_free', 'foster_paid'],
            true,
        );

        $this->notificationService->send(
            $response->helperProfile->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            [
                'message' => $needsHandover
                    ? 'Great news! Your offer to help with '.$pet->name.' was accepted. Please confirm when you receive the pet.'
                    : 'Great news! Your offer to help with '.$pet->name.' was accepted.',
                'link' => '/requests/'.$placementRequest->id,
                'pet_name' => $pet->name,
                'pet_id' => $pet->id,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ],
        );

        return true;
    }

    public function reject(PlacementRequestResponse $response): bool
    {
        if (! $response->reject()) {
            return false;
        }

        $placementRequest = $response->placementRequest;
        $pet = $placementRequest->pet;

        $this->notificationService->send(
            $response->helperProfile->user,
            NotificationType::HELPER_RESPONSE_REJECTED->value,
            [
                'message' => 'Your offer to help with '.$pet->name.' was declined. Thank you for reaching out!',
                'link' => '/requests/'.$placementRequest->id,
                'pet_name' => $pet->name,
                'pet_id' => $pet->id,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ],
        );

        return true;
    }

    public function cancel(PlacementRequestResponse $response): bool
    {
        if (! $response->cancel()) {
            return false;
        }

        $placementRequest = $response->placementRequest;
        $pet = $placementRequest->pet;
        $helperName = $response->helperProfile->user->name;

        $this->notificationService->send(
            $placementRequest->user,
            NotificationType::HELPER_RESPONSE_CANCELED->value,
            [
                'message' => $helperName.' withdrew their response for '.$pet->name.'.',
                'link' => '/requests/'.$placementRequest->id,
                'helper_name' => $helperName,
                'pet_name' => $pet->name,
                'pet_id' => $pet->id,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ],
        );

        return true;
    }
}
