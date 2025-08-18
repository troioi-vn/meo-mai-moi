<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use App\Models\HelperProfile;
use App\Models\Review;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

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
            'role' => \App\Enums\UserRole::class,
        ];
    }

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
    // Relationship: User owns many cats
    public function cats(): HasMany
    {
        return $this->hasMany(\App\Models\Cat::class);
    }

    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(\App\Models\OwnershipHistory::class);
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
        return !$this->hasRole(['admin', 'super_admin']);
    }
}
