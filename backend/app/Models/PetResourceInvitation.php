<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PetRelationshipType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetResourceInvitation extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'resource_invitation_id';

    protected $fillable = [
        'resource_invitation_id',
        'pet_id',
        'relationship_type',
    ];

    protected $casts = [
        'relationship_type' => PetRelationshipType::class,
    ];

    /**
     * @return BelongsTo<ResourceInvitation, $this>
     */
    public function invitation(): BelongsTo
    {
        return $this->belongsTo(ResourceInvitation::class, 'resource_invitation_id');
    }

    /**
     * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
