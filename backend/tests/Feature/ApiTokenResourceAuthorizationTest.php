<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Resources\ApiTokenResource;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTokenResourceAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_with_manage_api_tokens_permission_can_access_resource(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $this->assertTrue($admin->can('manage_api_tokens'));
        $this->assertTrue(ApiTokenResource::canAccess());
    }

    public function test_regular_user_cannot_access_resource(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->assertFalse($user->can('manage_api_tokens'));
        $this->assertFalse(ApiTokenResource::canAccess());
    }
}

