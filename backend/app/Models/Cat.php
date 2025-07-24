<?php

namespace App\Models;

use App\Enums\CatStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cat extends Model
{
    use HasFactory;

/**
 * @OA\Schema(
 *     schema="Cat",
 *     type="object",
 *     title="Cat",
 *     required={"id", "name", "breed", "birthday", "location", "description", "status", "user_id"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="breed", type="string", example="Siamese"),
 *     @OA\Property(property="birthday", type="string", format="date", example="2020-01-01"),
 *     @OA\Property(property="location", type="string", example="Hanoi"),
 *     @OA\Property(property="description", type="string", example="A friendly cat."),
 *     @OA\Property(property="status", type="string", example="active"),
 *     @OA\Property(property="user_id", type="integer", example=5)
 * )
 */
    // Returns the latest photo (main photo) for the cat
    public function photo()
    {
        return $this->hasOne(CatPhoto::class)->latestOfMany();
    }

    protected $fillable = [
        'name',
        'breed',
        'location',
        'description',
        'user_id',
        'status',
        'birthday',
    ];

    protected $casts = [
        'status' => CatStatus::class,
        'birthday' => 'date',
    ];

    public function medicalRecords(): HasMany
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function weightHistories(): HasMany
    {
        return $this->hasMany(WeightHistory::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CatComment::class);
    }

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute()
    {
        if ($this->photo) {
            return url('storage/' . $this->photo->path);
        }

        return null;
    }

    public function photos(): HasMany
    {
        return $this->hasMany(CatPhoto::class);
    }

    public function placementRequests(): HasMany
    {
        return $this->hasMany(PlacementRequest::class);
    }
}
