<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Pages\QueueOperations;
use App\Filament\Resources\ApiRequestLogResource;
use App\Filament\Resources\ApiRequestLogResource\Pages\ListApiRequestLogs;
use App\Filament\Resources\ApiTokenRevocationAuditResource;
use App\Filament\Resources\ApiTokenRevocationAuditResource\Pages\ListApiTokenRevocationAudits;
use App\Filament\Resources\ContentTranslationResource;
use App\Filament\Resources\ContentTranslationResource\Pages\ListContentTranslations;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AdminOperationsAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_read_only_audit_and_translation_resources(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $this->assertTrue(ApiRequestLogResource::canAccess());
        $this->assertTrue(ApiTokenRevocationAuditResource::canAccess());
        $this->assertTrue(ContentTranslationResource::canAccess());
        $this->assertFalse(ApiRequestLogResource::canCreate());
        $this->assertFalse(ApiTokenRevocationAuditResource::canCreate());
        $this->assertFalse(ContentTranslationResource::canCreate());
        $this->assertFalse(QueueOperations::canAccess());

        Livewire::test(ListApiRequestLogs::class)->assertSuccessful();
        Livewire::test(ListApiTokenRevocationAudits::class)->assertSuccessful();
        Livewire::test(ListContentTranslations::class)->assertSuccessful();
    }

    public function test_queue_operations_requires_super_admin(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');
        $this->actingAs($superAdmin);

        $this->assertTrue(QueueOperations::canAccess());
        Livewire::test(QueueOperations::class)->assertSuccessful();
    }

    public function test_regular_user_cannot_access_operations_surfaces(): void
    {
        $this->actingAs(User::factory()->create());

        $this->assertFalse(ApiRequestLogResource::canAccess());
        $this->assertFalse(ApiTokenRevocationAuditResource::canAccess());
        $this->assertFalse(ContentTranslationResource::canAccess());
        $this->assertFalse(QueueOperations::canAccess());
    }
}
