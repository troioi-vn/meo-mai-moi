<?php

namespace App\Providers;

use App\Models\Cat;
use App\Models\HelperProfile;
use App\Policies\CatPolicy;
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
        Cat::class => CatPolicy::class,
        HelperProfile::class => HelperProfilePolicy::class,
        TransferRequest::class => TransferRequestPolicy::class,
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
