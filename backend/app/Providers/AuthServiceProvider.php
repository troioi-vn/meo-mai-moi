<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Category;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\City;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Policies\CategoryPolicy;
use App\Policies\ChatMessagePolicy;
use App\Policies\ChatPolicy;
use App\Policies\CityPolicy;
use App\Policies\HelperProfilePolicy;
use App\Policies\PetPolicy;
use App\Policies\TransferRequestPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Category::class => CategoryPolicy::class,
        City::class => CityPolicy::class,
        HelperProfile::class => HelperProfilePolicy::class,
        \App\Models\TransferRequest::class => TransferRequestPolicy::class,
        \App\Models\PlacementRequest::class => \App\Policies\PlacementRequestPolicy::class,
        Pet::class => PetPolicy::class,
        Chat::class => ChatPolicy::class,
        ChatMessage::class => ChatMessagePolicy::class,
        \App\Models\NotificationTemplate::class => \App\Policies\NotificationTemplatePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Implicitly grant "super_admin" role all permissions
        // This is safe because Spatie Permission syncs them, but this Gate::before
        // callback ensures they pass checks even if permissions aren't explicitly assigned.
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('super_admin') ? true : null;
        });
    }
}
