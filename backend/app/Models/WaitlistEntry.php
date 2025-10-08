<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WaitlistEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'status',
        'invited_at'
    ];

    protected $casts = [
        'invited_at' => 'datetime',
    ];

    /**
     * Mark this entry as invited
     */
    public function markAsInvited(): void
    {
        $this->update([
            'status' => 'invited',
            'invited_at' => now(),
        ]);
    }

    /**
     * Scope for pending entries
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for invited entries
     */
    public function scopeInvited(Builder $query): Builder
    {
        return $query->where('status', 'invited');
    }

    /**
     * Check if email is already on waitlist
     */
    public static function isEmailOnWaitlist(string $email): bool
    {
        return static::where('email', $email)->exists();
    }

    /**
     * Get pending entries ordered by creation date
     */
    public static function getPendingEntries()
    {
        return static::pending()->orderBy('created_at')->get();
    }

    /**
     * Validation rules for email
     */
    public static function validationRules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:waitlist_entries,email',
                'unique:users,email', // Prevent existing users from joining waitlist
            ],
        ];
    }
}
