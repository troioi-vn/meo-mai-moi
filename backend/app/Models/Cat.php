<?php

namespace App\Models;

use App\Enums\CatStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cat extends Model
{
    use HasFactory;

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
}
