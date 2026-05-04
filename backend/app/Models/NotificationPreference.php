<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\NotificationType;
use Database\Factories\NotificationPreferenceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    /** @use HasFactory<NotificationPreferenceFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'notification_type',
        'email_enabled',
        'in_app_enabled',
        'telegram_enabled',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'in_app_enabled' => 'boolean',
        'telegram_enabled' => 'boolean',
    ];

    /**
     * Get the user that owns the notification preference.
        *
        * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get or create a notification preference for a user and type.
     */
    public static function getPreference(User $user, string $type): self
    {
        return self::firstOrCreate(
            [
                'user_id' => $user->id,
                'notification_type' => $type,
            ],
            [
                'email_enabled' => true,
                'in_app_enabled' => true,
            ]
        );
    }

    /**
     * Update notification preference for a user and type.
     */
    public static function updatePreference(User $user, string $type, ?bool $email = null, ?bool $inApp = null, ?bool $telegram = null): void
    {
        $preference = self::getPreference($user, $type);

        if ($email !== null) {
            $preference->email_enabled = $email;
        }

        if ($inApp !== null) {
            $preference->in_app_enabled = $inApp;
        }

        if ($telegram !== null) {
            $preference->telegram_enabled = $telegram;
        }

        $preference->save();
    }

    /**
     * Check if email notifications are enabled for a user and type.
     */
    public static function isEmailEnabled(User $user, string $type): bool
    {
        $preference = self::where('user_id', $user->id)
            ->where('notification_type', $type)
            ->first();

        return $preference ? $preference->email_enabled : true; // Default to enabled
    }

    /**
     * Check if in-app notifications are enabled for a user and type.
     */
    public static function isInAppEnabled(User $user, string $type): bool
    {
        $preference = self::where('user_id', $user->id)
            ->where('notification_type', $type)
            ->first();

        return $preference ? $preference->in_app_enabled : true; // Default to enabled
    }

    /**
     * Get all preferences for a user, creating defaults for missing types.
     *
     * @return Collection<int, self>
     */
    public static function getAllForUser(User $user): Collection
    {
        /** @var Collection<string, self> $existingPreferences */
        $existingPreferences = self::where('user_id', $user->id)->get()->keyBy('notification_type');
        $allPreferences = [];

        foreach (NotificationType::cases() as $type) {
            if ($existingPreferences->has($type->value)) {
                $preference = $existingPreferences->get($type->value);

                if ($preference instanceof self) {
                    $allPreferences[] = $preference;
                }
            } else {
                $allPreferences[] = self::getPreference($user, $type->value);
            }
        }

        return new Collection($allPreferences);
    }

    /**
     * Scope to get preferences for a specific user.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    /**
     * Scope to get preferences for a specific notification type.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeForType(Builder $query, string $type): Builder
    {
        return $query->where('notification_type', $type);
    }

    /**
     * Check if email is enabled for this preference instance.
     */
    public function hasEmailEnabled(): bool
    {
        return $this->email_enabled;
    }

    /**
     * Check if in-app is enabled for this preference instance.
     */
    public function hasInAppEnabled(): bool
    {
        return $this->in_app_enabled;
    }

    /**
     * Check if Telegram notifications are enabled for a user and type.
     */
    public static function isTelegramEnabled(User $user, string $type): bool
    {
        $preference = self::where('user_id', $user->id)
            ->where('notification_type', $type)
            ->first();

        return $preference ? $preference->telegram_enabled : false; // Default to disabled
    }

    /**
     * Check if Telegram is enabled for this preference instance.
     */
    public function hasTelegramEnabled(): bool
    {
        return $this->telegram_enabled;
    }
}
