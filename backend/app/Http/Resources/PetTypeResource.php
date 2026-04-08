<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PetTypeResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'is_system' => $this->is_system,
            'display_order' => $this->display_order,
            'placement_requests_allowed' => $this->placement_requests_allowed,
            'weight_tracking_allowed' => $this->weight_tracking_allowed,
            'microchips_allowed' => $this->microchips_allowed,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
