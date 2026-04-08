<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HelperProfileResource extends JsonResource
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
            'user_id' => $this->user_id,
            'experience' => $this->experience,
            'offer' => $this->offer,
            'country' => $this->country,
            'address' => $this->address,
            'city_id' => $this->city_id,
            'city' => $this->city,
            'state' => $this->state,
            'zip_code' => $this->zip_code,
            'phone_number' => $this->phone_number,
            'contact_details' => $this->contact_details,
            'has_pets' => $this->has_pets,
            'has_children' => $this->has_children,
            'request_types' => $this->request_types,
            'approval_status' => $this->approval_status,
            'status' => $this->status,
            'photos' => $this->photos,
            'cities' => CityResource::collection($this->whenLoaded('cities')),
            'pet_types' => PetTypeResource::collection($this->whenLoaded('petTypes')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'archived_at' => $this->archived_at,
            'restored_at' => $this->restored_at,
            'deleted_at' => $this->deleted_at,
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
