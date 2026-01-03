<?php

namespace App\Http\Resources;

use App\Enums\PlacementResponseStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlacementRequestResponseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'placement_request_id' => $this->placement_request_id,
            'helper_profile_id' => $this->helper_profile_id,
            'status' => $this->status,
            'message' => $this->message,
            'responded_at' => $this->responded_at,
            'accepted_at' => $this->accepted_at,
            'rejected_at' => $this->rejected_at,
            'cancelled_at' => $this->cancelled_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'helper_profile' => new HelperProfileResource($this->whenLoaded('helperProfile')),
            'placement_request' => new PlacementRequestResource($this->whenLoaded('placementRequest')),
            // Include transfer_request when the response is accepted (for non-pet_sitting types)
            'transfer_request' => $this->when(
                $this->status === PlacementResponseStatus::ACCEPTED || $this->resource->relationLoaded('transferRequest'),
                fn () => $this->whenLoaded('transferRequest', fn () => new TransferRequestResource($this->transferRequest))
            ),
        ];
    }
}
