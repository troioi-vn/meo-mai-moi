<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HabitValueType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Habit extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'name',
        'value_type',
        'scale_min',
        'scale_max',
        'share_with_coowners',
        'reminder_enabled',
        'reminder_time',
        'reminder_weekdays',
        'archived_at',
    ];

    protected $casts = [
        'value_type' => HabitValueType::class,
        'share_with_coowners' => 'boolean',
        'reminder_enabled' => 'boolean',
        'reminder_weekdays' => 'array',
        'reminder_time' => 'string',
        'archived_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function pets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'habit_pet')
            ->withTimestamps();
    }

    public function entries(): HasMany
    {
        return $this->hasMany(HabitEntry::class);
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
