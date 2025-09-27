<?php

namespace App\Providers;

use App\Models\HelperProfile;
use App\Models\Pet;
use App\Policies\PetPolicy;
use App\Policies\HelperProfilePolicy;
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
        HelperProfile::class => HelperProfilePolicy::class,
        \App\Models\TransferRequest::class => TransferRequestPolicy::class,
        \App\Models\PlacementRequest::class => \App\Policies\PlacementRequestPolicy::class,
        Pet::class => PetPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        //
    }
}
