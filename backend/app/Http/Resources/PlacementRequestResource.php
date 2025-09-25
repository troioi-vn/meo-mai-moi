<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlacementRequestResource extends JsonResource
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
            'pet_id' => $this->pet_id,
            'user_id' => $this->user_id,
            'request_type' => $this->request_type,
            'status' => $this->status,
            'notes' => $this->notes,
            'expires_at' => $this->expires_at ? $this->expires_at->toDateString() : null,
            'start_date' => $this->start_date ? $this->start_date->toDateString() : null,
            'end_date' => $this->end_date ? $this->end_date->toDateString() : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
