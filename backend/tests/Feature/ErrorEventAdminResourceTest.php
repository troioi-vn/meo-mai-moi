<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Resources\ErrorEventResource;
use App\Filament\Resources\ErrorEventResource\Pages\ListErrorEvents;
use App\Filament\Resources\ErrorEventResource\Pages\ViewErrorEvent;
use App\Models\ErrorEvent;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ErrorEventAdminResourceTest extends TestCase
{
    #[Test]
    public function admins_can_browse_but_cannot_mutate_runtime_errors(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $event = ErrorEvent::factory()->create();

        $this->actingAs($admin);

        $this->assertTrue(ErrorEventResource::canAccess());
        $this->assertFalse(ErrorEventResource::canCreate());
        $this->assertFalse(ErrorEventResource::canEdit($event));
        $this->assertFalse(ErrorEventResource::canDelete($event));
        Livewire::test(ListErrorEvents::class)->assertSuccessful();
        Livewire::test(ViewErrorEvent::class, ['record' => $event->getRouteKey()])->assertSuccessful();
    }

    #[Test]
    public function regular_users_cannot_access_runtime_errors(): void
    {
        $this->actingAs(User::factory()->create());

        $this->assertFalse(ErrorEventResource::canAccess());
    }
}
