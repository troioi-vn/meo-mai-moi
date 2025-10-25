<?php

namespace App\Models;

use App\Notifications\CustomPasswordReset;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements FilamentUser, MustVerifyEmail, HasMedia
{
    use HasApiTokens;

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory;

    use HasRoles;
    use InteractsWithMedia;
    use Notifiable;
    use TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
        'two_factor_confirmed_at',
    ];

    public function helperProfiles(): HasMany
    {
        return $this->hasMany(HelperProfile::class);
    }

    public function reviewsGiven(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function reviewsBeingReviewed(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewed_user_id');
    }

    // Relationship: User owns many pets
    public function pets(): HasMany
    {
        return $this->hasMany(\App\Models\Pet::class);
    }

    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(\App\Models\OwnershipHistory::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    /**
     * Invitations sent by this user
     */
    public function sentInvitations(): HasMany
    {
        return $this->hasMany(Invitation::class, 'inviter_user_id');
    }

    /**
     * Invitations received by this user
     */
    public function receivedInvitations(): HasMany
    {
        return $this->hasMany(Invitation::class, 'recipient_user_id');
    }

    /**
     * Determine if the user can access the Filament admin panel.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Allow access if user has admin or super_admin role
        return $this->hasRole(['admin', 'super_admin']);
    }

    /**
     * Whether this user can start impersonation.
     * Used by stechstudio/filament-impersonate if present.
     */
    public function canImpersonate(): bool
    {
        return $this->hasRole(['admin', 'super_admin']);
    }

    /**
     * Whether this user can be impersonated.
     * Prevent impersonating admins/super_admins.
     */
    public function canBeImpersonated(): bool
    {
        return ! $this->hasRole(['admin', 'super_admin']);
    }

    /**
     * Send the password reset notification.
     * Uses Laravel's native notification system with custom EmailLog integration.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        // Use Laravel's proper notification system
        // This will integrate with your EmailLog system via the CustomPasswordReset notification
        $this->notify(new CustomPasswordReset($token));
    }

    /**
     * Send the email verification notification.
     * Uses our custom notification system for consistent email handling.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\VerifyEmail);
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml']);
    }

    /**
     * Register media conversions for this model.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('avatar_thumb')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 128, 128)
            ->nonQueued()
            ->performOnCollections('avatar');

        $this->addMediaConversion('avatar_256')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256)
            ->nonQueued()
            ->performOnCollections('avatar');

        $this->addMediaConversion('avatar_webp')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256)
            ->format('webp')
            ->nonQueued()
            ->performOnCollections('avatar');


    }

    /**
     * Get avatar URL attribute - returns URL from MediaLibrary.
     */
    public function getAvatarUrlAttribute()
    {
        return $this->getFirstMediaUrl('avatar', 'avatar_256') ?: null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}