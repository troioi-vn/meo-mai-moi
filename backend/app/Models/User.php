<?php

namespace App\Models;

use App\Enums\PetRelationshipType;
use App\Notifications\CustomPasswordReset;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Traits\HasRoles;

/**
 * @OA\Schema(
 *     schema="User",
 *     title="User",
 *     description="User model",
 *
 *     @OA\Property(property="id", type="integer", format="int64", description="User ID"),
 *     @OA\Property(property="name", type="string", description="User's name"),
 *     @OA\Property(property="email", type="string", format="email", description="User's email address"),
 *     @OA\Property(property="avatar_url", type="string", nullable=true, description="URL to the user's avatar image"),
 *     @OA\Property(property="has_password", type="boolean", description="Whether the user has a local password set"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of user creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last user update")
 * )
 */
class User extends Authenticatable implements FilamentUser, HasMedia, MustVerifyEmail
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
        'google_id',
        'google_token',
        'google_refresh_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar_url',
        'has_password',
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
        'google_token',
        'google_refresh_token',
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
        return $this->hasMany(\App\Models\Pet::class, 'created_by');
    }

    /**
     * Get ownership history for this user (via relationships)
     */
    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(PetRelationship::class)
            ->where('relationship_type', PetRelationshipType::OWNER->value)
            ->orderBy('start_at', 'desc');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get pets created by this user
     */
    public function createdPets(): HasMany
    {
        return $this->hasMany(Pet::class, 'created_by');
    }

    /**
     * Get all pet relationships for this user
     */
    public function petRelationships(): HasMany
    {
        return $this->hasMany(PetRelationship::class);
    }

    /**
     * Get active pet relationships for this user
     */
    public function activePetRelationships(): HasMany
    {
        return $this->hasMany(PetRelationship::class)->whereNull('end_at');
    }

    /**
     * Get pets this user owns
     */
    public function ownedPets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::OWNER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get pets this user fosters
     */
    public function fosteredPets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::FOSTER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get pets this user can edit
     */
    public function editablePets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::EDITOR->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get pets this user can view
     */
    public function viewablePets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::VIEWER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    /**
     * Get the chats this user participates in.
     */
    public function chats(): BelongsToMany
    {
        return $this->belongsToMany(Chat::class, 'chat_users')
            ->withPivot(['role', 'joined_at', 'left_at', 'last_read_at'])
            ->withTimestamps();
    }

    /**
     * Get the active chats (not left).
     */
    public function activeChats(): BelongsToMany
    {
        return $this->chats()->whereNull('chat_users.left_at');
    }

    /**
     * Get the count of chats with unread messages.
     */
    public function getUnreadChatsCountAttribute(): int
    {
        return Chat::forUser($this)
            ->withUnreadCount($this)
            ->get()
            ->filter(fn ($chat) => $chat->unread_count > 0)
            ->count();
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
        // Skip conversions during testing to avoid parallel test conflicts
        if (app()->environment('testing')) {
            return;
        }

        $this->addMediaConversion('avatar_thumb')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 128, 128);

        $this->addMediaConversion('avatar_256')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256);

        $this->addMediaConversion('avatar_webp')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256)
            ->format('webp');
    }

    /**
     * Get avatar URL attribute - returns URL from MediaLibrary.
     * Falls back to original image if conversion is not ready.
     */
    public function getAvatarUrlAttribute()
    {
        // Try to get the converted image first
        $convertedUrl = $this->getFirstMediaUrl('avatar', 'avatar_256');

        // If conversion doesn't exist yet, fall back to original
        if (! $convertedUrl) {
            $convertedUrl = $this->getFirstMediaUrl('avatar');
        }

        return $convertedUrl ?: null;
    }

    /**
     * Get has_password attribute - returns true if user has a password set.
     */
    public function getHasPasswordAttribute(): bool
    {
        return ! empty($this->password);
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
