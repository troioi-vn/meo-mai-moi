<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cat extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'breed',
        'location',
        'description',
        'user_id',
        'status',
        'birthday',
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

    public function photos(): HasMany
    {
        return $this->hasMany(CatPhoto::class);
    }
}
