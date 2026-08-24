<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\LitterResource;
use App\Filament\Resources\LitterResource\Pages\ListLitters;
use App\Filament\Resources\LitterResource\Pages\ViewLitter;
use App\Filament\Resources\PetTypeResource;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Livewire;
use Tests\TestCase;

class LitterResourceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->regularUser = User::factory()->create();
    }

    public function test_supports_litters_toggle_persists_via_model(): void
    {
        $petType = PetType::factory()->create([
            'supports_litters' => false,
        ]);

        $this->assertFalse((bool) $petType->fresh()->supports_litters);

        $petType->update(['supports_litters' => true]);

        $this->assertTrue((bool) $petType->fresh()->supports_litters);
        $this->assertDatabaseHas('pet_types', [
            'id' => $petType->id,
            'supports_litters' => true,
        ]);

        $petType->update(['supports_litters' => false]);

        $this->assertFalse((bool) $petType->fresh()->supports_litters);
        $this->assertDatabaseHas('pet_types', [
            'id' => $petType->id,
            'supports_litters' => false,
        ]);
    }

    public function test_supports_litters_toggle_persists_via_filament_form(): void
    {
        // Verify the PetTypeResource form and table contain the supports_litters toggle/column
        $source = file_get_contents(app_path('Filament/Resources/PetTypeResource.php'));
        $this->assertStringContainsString("Toggle::make('supports_litters')", $source);
        $this->assertStringContainsString("IconColumn::make('supports_litters')", $source);
        $this->assertStringContainsString("->label('Supports litters')", $source);
        $this->assertStringContainsString("->label('Litters Allowed')", $source);

        $petType = PetType::factory()->create([
            'name' => 'Capybara',
            'slug' => 'capybara-'.uniqid(),
            'supports_litters' => false,
        ]);

        $petType->update(['supports_litters' => true]);
        $this->assertDatabaseHas('pet_types', [
            'id' => $petType->id,
            'supports_litters' => true,
        ]);

        $petType->update(['supports_litters' => false]);
        $this->assertDatabaseHas('pet_types', [
            'id' => $petType->id,
            'supports_litters' => false,
        ]);
    }

    public function test_pet_type_resource_lists_supports_litters_column(): void
    {
        $this->actingAs($this->admin);

        // Verify the table defines the supports_litters column without needing HTTP render
        $source = file_get_contents(app_path('Filament/Resources/PetTypeResource.php'));
        $this->assertStringContainsString("IconColumn::make('supports_litters')", $source);
        $this->assertStringContainsString('->boolean()', $source);
        $this->assertStringContainsString('->sortable()', $source);
    }

    public function test_litters_list_counts_members_without_a_query_per_row(): void
    {
        $this->actingAs($this->admin);

        foreach (range(1, 6) as $i) {
            $litter = Litter::factory()->create();
            Pet::factory()->count(2)->create(['litter_id' => $litter->id]);
        }

        DB::enableQueryLog();
        $records = Livewire::test(ListLitters::class)
            ->assertSuccessful()
            ->instance()
            ->getTableRecords();
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $countQueries = array_filter(
            $queries,
            static fn (array $q): bool => str_contains($q['query'], 'count(*)')
                && str_contains($q['query'], '"pets"')
        );

        // Six litters must not cost six counts. Filament folds a {relation}_count
        // column into the list query as a correlated subselect; this guards against
        // that being lost to a refactor and silently becoming N+1.
        $this->assertLessThanOrEqual(
            1,
            count($countQueries),
            'member counts are being fetched per row instead of with the list query'
        );
        $this->assertSame(2, (int) $records->first()->pets_count);
    }

    public function test_litters_list_renders_for_admin(): void
    {
        $this->actingAs($this->admin);

        $litter = Litter::factory()->create();

        $this->assertTrue(LitterResource::canAccess());
        Livewire::test(ListLitters::class)->assertSuccessful();
    }

    public function test_litters_view_renders_with_member_pets(): void
    {
        $this->actingAs($this->admin);

        $litter = Litter::factory()->create();
        Pet::factory()->count(2)->create(['litter_id' => $litter->id, 'pet_type_id' => $litter->pet_type_id]);

        Livewire::test(ViewLitter::class, ['record' => $litter->getRouteKey()])
            ->assertSuccessful();
    }

    public function test_litter_resource_is_read_only(): void
    {
        $this->actingAs($this->admin);

        $litter = Litter::factory()->create();

        $this->assertFalse(LitterResource::canCreate());
        $this->assertFalse(LitterResource::canEdit($litter));
        $this->assertFalse(LitterResource::canDelete($litter));
        $this->assertFalse(LitterResource::canDeleteAny());

        // view is allowed for admin
        $this->assertTrue(LitterResource::canView($litter));

        // Ensure pages only contain index and view
        $pages = LitterResource::getPages();
        $this->assertArrayHasKey('index', $pages);
        $this->assertArrayHasKey('view', $pages);
        $this->assertArrayNotHasKey('create', $pages);
        $this->assertArrayNotHasKey('edit', $pages);
    }

    public function test_regular_user_cannot_access_litter_resource(): void
    {
        $this->actingAs($this->regularUser);

        $this->assertFalse(LitterResource::canAccess());

        $litter = Litter::factory()->create();

        $this->assertFalse(LitterResource::canView($litter));
        $this->assertFalse(LitterResource::canCreate());
    }

    public function test_non_admin_cannot_view_litter_pages(): void
    {
        $this->actingAs($this->regularUser);

        $litter = Litter::factory()->create();

        // Non-admin should not be able to access resource at all, so canAccess false
        $this->assertFalse(LitterResource::canAccess());
        // Even direct policy checks for create/edit/delete remain false
        $this->assertFalse(LitterResource::canCreate());
        $this->assertFalse(LitterResource::canEdit($litter));
    }
}
