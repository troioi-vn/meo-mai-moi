<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\WaitlistEntryStatus;
use Database\Factories\WaitlistEntryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WaitlistEntry extends Model
{
    /** @use HasFactory<WaitlistEntryFactory> */
    use HasFactory;

    protected $fillable = [
        'email',
        'status',
        'locale',
        'invited_at',
    ];

    protected $casts = [
        'status' => WaitlistEntryStatus::class,
        'invited_at' => 'datetime',
    ];

    /**
     * Mark this entry as invited
     */
    public function markAsInvited(): void
    {
        $this->update([
            'status' => WaitlistEntryStatus::INVITED,
            'invited_at' => now(),
        ]);
    }

    /**
     * Scope for pending entries
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', WaitlistEntryStatus::PENDING);
    }

    /**
     * Scope for invited entries
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeInvited(Builder $query): Builder
    {
        return $query->where('status', WaitlistEntryStatus::INVITED);
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
     *
     * @return Collection<int, self>
     */
    public static function getPendingEntries(): Collection
    {
        return static::pending()->orderBy('created_at')->get();
    }

    /**
     * Validation rules for email
     *
     * @return array<string, list<string>>
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
