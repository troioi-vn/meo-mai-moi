# Models Refactor - Remaining Suggestions

## 5. Missing Validation Rules

### Add Model Validation
Models currently lack validation for business rules. Consider adding validation in the following areas:

#### FosterAssignment Model
```php
protected static function boot()
{
    parent::boot();
    
    static::saving(function ($model) {
        // Validate date ranges
        if ($model->expected_end_date && $model->start_date) {
            if ($model->expected_end_date <= $model->start_date) {
                throw new \InvalidArgumentException('End date must be after start date');
            }
        }
        
        // Validate status transitions
        if ($model->isDirty('status')) {
            $original = $model->getOriginal('status');
            $new = $model->status;
            
            // Define valid transitions
            $validTransitions = [
                FosterAssignmentStatus::ACTIVE->value => [
                    FosterAssignmentStatus::COMPLETED->value,
                    FosterAssignmentStatus::CANCELED->value
                ],
                // Add other valid transitions
            ];
            
            if ($original && !in_array($new->value, $validTransitions[$original] ?? [])) {
                throw new \InvalidArgumentException("Invalid status transition from {$original} to {$new->value}");
            }
        }
    });
}
```

#### User Model
```php
// Add validation for email format, phone numbers
protected static function boot()
{
    parent::boot();
    
    static::saving(function ($user) {
        if ($user->email && !filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email format');
        }
    });
}
```

#### HelperProfile Model
```php
// Add validation for required fields based on capabilities
protected static function boot()
{
    parent::boot();
    
    static::saving(function ($profile) {
        if ($profile->can_foster && !$profile->address) {
            throw new \InvalidArgumentException('Address is required for foster profiles');
        }
        
        if ($profile->phone_number && !preg_match('/^[\+]?[1-9][\d]{0,15}$/', $profile->phone_number)) {
            throw new \InvalidArgumentException('Invalid phone number format');
        }
    });
}
```

## 6. Performance Optimizations

### Fix N+1 Query Issues

#### Pet Model - Photo URL Attribute
Current implementation:
```php
protected $appends = ['photo_url'];

public function getPhotoUrlAttribute()
{
    if ($this->photo) {
        return url('storage/'.$this->photo->path);
    }
    return null;
}
```

**Recommended fix:**
```php
// Remove from $appends and create a method instead
public function getPhotoUrl(): ?string
{
    if ($this->relationLoaded('photo') && $this->photo) {
        return url('storage/'.$this->photo->path);
    }
    return null;
}

// Or use a scope for eager loading
public function scopeWithPhoto($query)
{
    return $query->with('photo');
}
```

### Add Database Indexes
Review your migrations and add indexes for:
- Foreign keys (if not already indexed)
- Frequently queried fields like `status`, `created_at`
- Composite indexes for common query patterns

```php
// Example migration additions
$table->index(['status', 'created_at']);
$table->index(['user_id', 'status']);
$table->index(['pet_id', 'record_date']); // for medical records, weight history
```

## 7. Security Improvements

### Mass Assignment Protection
Review and tighten `$fillable` arrays:

#### User Model
```php
// Consider using $guarded instead for sensitive models
protected $guarded = [
    'id',
    'email_verified_at',
    'remember_token',
    'created_at',
    'updated_at',
];

// Or be more restrictive with $fillable
protected $fillable = [
    'name',
    'email',
    // Remove 'password' from fillable, handle separately
];
```

#### Review Model
```php
// Remove sensitive fields from mass assignment
protected $fillable = [
    'reviewer_user_id',
    'reviewed_user_id',
    'rating',
    'comment',
    'transfer_id',
    // Remove moderation fields from fillable
];

protected $guarded = [
    'status',
    'moderation_notes',
    'is_flagged',
    'flagged_at',
    'moderated_by',
    'moderated_at',
];
```

## 8. Settings Model Improvements

### Type-Safe Settings
Consider using a more robust settings system:

```php
// Create specific setting classes
class InviteOnlySettings
{
    public static function isEnabled(): bool
    {
        return Settings::get('invite_only_enabled', false) === 'true';
    }
    
    public static function enable(): void
    {
        Settings::set('invite_only_enabled', 'true');
    }
    
    public static function disable(): void
    {
        Settings::set('invite_only_enabled', 'false');
    }
}
```

Or consider using `spatie/laravel-settings` package for better type safety and structure.

## 9. Additional Enum Suggestions

### Create Missing Enums
```php
// HelperProfileStatus.php
enum HelperProfileStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case SUSPENDED = 'suspended';
}

// NotificationStatus.php  
enum NotificationStatus: string
{
    case PENDING = 'pending';
    case DELIVERED = 'delivered';
    case FAILED = 'failed';
    case READ = 'read';
}

// InvitationStatus.php
enum InvitationStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case EXPIRED = 'expired';
    case REVOKED = 'revoked';
}
```

## 10. Relationship Improvements

### Add Missing Inverse Relationships
Ensure all relationships have their inverse defined for better query optimization.

### Consider Polymorphic Relationships
For models like `Notification` that might relate to different types of entities, consider using polymorphic relationships:

```php
// In Notification model
public function notifiable()
{
    return $this->morphTo();
}

// Usage: notifications for pets, users, transfers, etc.
```

## 11. Model Events and Observers

### Create Model Observers
For complex business logic, consider creating observers:

```php
// FosterAssignmentObserver.php
class FosterAssignmentObserver
{
    public function creating(FosterAssignment $assignment)
    {
        // Auto-set start_date if not provided
        if (!$assignment->start_date) {
            $assignment->start_date = now();
        }
    }
    
    public function updated(FosterAssignment $assignment)
    {
        // Send notifications on status changes
        if ($assignment->wasChanged('status')) {
            // Dispatch notification job
        }
    }
}
```

## 12. Testing Considerations

### Add Model Factories
Ensure all models have proper factories for testing:

```php
// FosterAssignmentFactory.php
public function definition()
{
    return [
        'pet_id' => Pet::factory(),
        'owner_user_id' => User::factory(),
        'foster_user_id' => User::factory(),
        'status' => FosterAssignmentStatus::ACTIVE,
        'start_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
        'expected_end_date' => $this->faker->dateTimeBetween('now', '+3 months'),
    ];
}
```

### Model Testing
Create comprehensive model tests covering:
- Relationships
- Scopes
- Computed attributes
- Validation rules
- Status transitions

## Implementation Priority

1. **High Priority**: Validation rules, security improvements
2. **Medium Priority**: Performance optimizations, additional enums
3. **Low Priority**: Settings improvements, observers, polymorphic relationships

## Migration Considerations

When implementing these changes, you'll need to create migrations for:
- Adding `deleted_at` columns for soft deletes
- Adding database indexes
- Updating enum values in existing data
- Adding any new required columns

Remember to backup your database before running migrations in production!