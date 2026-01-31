<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'UserResource',
    title: 'User Resource',
    description: 'User resource for API responses'
)]
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    #[OA\Property(property: 'name', type: 'string', example: 'John Doe')]
    #[OA\Property(property: 'email', type: 'string', format: 'email', example: 'john@example.com')]
    #[OA\Property(property: 'locale', type: 'string', example: 'en')]
    #[OA\Property(property: 'avatar_url', type: 'string', nullable: true, example: null)]
    #[OA\Property(property: 'is_banned', type: 'boolean', example: false)]
    #[OA\Property(property: 'banned_at', type: 'string', format: 'date-time', nullable: true, example: null)]
    #[OA\Property(property: 'ban_reason', type: 'string', nullable: true, example: null)]
    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z')]
    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z')]
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'locale' => $this->locale ?? 'en',
            'avatar_url' => $this->avatar_url,
            'is_banned' => (bool) $this->is_banned,
            'banned_at' => $this->banned_at,
            'ban_reason' => $this->ban_reason,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
